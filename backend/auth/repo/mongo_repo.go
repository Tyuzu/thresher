package repo

import (
	"context"

	"naevis/auth/domain"
	"naevis/config"
	"naevis/infra/cache"
	db "naevis/infra/db"
	"naevis/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoAuthRepo struct {
	db db.Database
	c  cache.Cache
}

func NewMongoRepo(d db.Database, c cache.Cache) domain.AuthRepository {
	return &MongoAuthRepo{db: d, c: c}
}

func (m *MongoAuthRepo) CreateUser(ctx context.Context, user models.User) error {
	return m.db.Insert(ctx, config.Collections.UserCollection, user)
}

func (m *MongoAuthRepo) FindUserByUsername(ctx context.Context, username string) (models.User, error) {
	var user models.User
	if err := m.db.FindOne(ctx, config.Collections.UserCollection, bson.M{"username": username}, &user); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (m *MongoAuthRepo) UpdateUserSession(ctx context.Context, userID, refreshTokenHash, ua, ip string) error {
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, bson.M{"$set": bson.M{"refreshtoken": refreshTokenHash, "refreshexpiry": time.Now().Add(7 * 24 * time.Hour), "refreshua": ua, "refreship": ip, "lastlogin": time.Now(), "online": true, "updatedat": time.Now()}})
}

func (m *MongoAuthRepo) LogoutUserByRefreshToken(ctx context.Context, hashedToken string) error {
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"refresh_token": hashedToken}, bson.M{"$unset": bson.M{"refreshtoken": "", "refreshexpiry": ""}, "$set": bson.M{"online": false, "updatedat": time.Now()}})
}

func (m *MongoAuthRepo) LogoutAllUserSessions(ctx context.Context, userID string) error {
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, bson.M{"$unset": bson.M{"refreshtoken": "", "refreshprev": "", "refreshexpiry": "", "refreshua": "", "refreship": ""}, "$set": bson.M{"online": false, "updatedat": time.Now()}})
}

func (m *MongoAuthRepo) FindValidRefreshSession(ctx context.Context, hashedToken string) (models.User, error) {
	now := time.Now()
	var user models.User
	err := m.db.FindOne(ctx, config.Collections.UserCollection, bson.M{"refreshexpiry": bson.M{"$gt": now}, "$or": []bson.M{{"refreshtoken": hashedToken}, {"refreshprev": hashedToken}}}, &user)
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (m *MongoAuthRepo) InvalidateUserSession(ctx context.Context, userID string) error {
	now := time.Now()
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, bson.M{"$set": bson.M{"refreshtoken": nil, "refreshprev": nil, "refreshexpiry": nil, "refreshua": nil, "updatedat": now}})
}

func (m *MongoAuthRepo) RotateRefreshTokenForUser(ctx context.Context, userID, newRefreshHash, prevRefreshHash, ua string) error {
	now := time.Now()
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, bson.M{"$set": bson.M{"refreshprev": prevRefreshHash, "refreshtoken": newRefreshHash, "refreshexpiry": now.Add(7 * 24 * time.Hour), "refreshua": ua, "updatedat": now}})
}

func (m *MongoAuthRepo) VerifyUserEmail(ctx context.Context, email string) error {
	return m.db.Update(ctx, config.Collections.UserCollection, bson.M{"email": email}, bson.M{"$set": bson.M{"emailverified": true}})
}

// OTP cache via cache interface
func (m *MongoAuthRepo) SaveOTPCache(ctx context.Context, email, hashedOTP string) error {
	key := "otp:" + email
	return m.c.SetWithExpiry(ctx, key, []byte(hashedOTP), 10*time.Minute)
}

func (m *MongoAuthRepo) GetOTPCache(ctx context.Context, email string) ([]byte, error) {
	key := "otp:" + email
	return m.c.Get(ctx, key)
}

func (m *MongoAuthRepo) DeleteOTPCache(ctx context.Context, email string) error {
	key := "otp:" + email
	return m.c.Del(ctx, key)
}
