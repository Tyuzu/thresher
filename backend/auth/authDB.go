package auth

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var UsersCollection = config.Collections.UserCollection

func CreateUser(ctx context.Context, dbLayer db.Database, user models.User) error {
	return dbLayer.Insert(ctx, UsersCollection, user)
}

func FindUserByUsername(ctx context.Context, dbLayer db.Database, username string) (*models.User, error) {
	var user models.User
	if err := dbLayer.FindOne(ctx, UsersCollection, bson.M{"username": username}, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func UpdateUserSession(ctx context.Context, dbLayer db.Database, userID, refreshTokenHash, ua, ip string) error {
	return dbLayer.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refresh_token":  refreshTokenHash,
			"refresh_expiry": time.Now().Add(RefreshTokenTTL),
			"refresh_ua":     ua,
			"refresh_ip":     ip,
			"last_login":     time.Now(),
			"online":         true,
			"updated_at":     time.Now(),
		},
	})
}

func LogoutUserByRefreshToken(ctx context.Context, dbLayer db.Database, hashedToken string) error {
	return dbLayer.Update(ctx, UsersCollection, bson.M{"refresh_token": hashedToken}, bson.M{
		"$unset": bson.M{
			"refresh_token":  "",
			"refresh_expiry": "",
		},
		"$set": bson.M{
			"online":     false,
			"updated_at": time.Now(),
		},
	})
}

func LogoutAllUserSessions(ctx context.Context, dbLayer db.Database, userID string) error {
	return dbLayer.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$unset": bson.M{
			"refresh_token":  "",
			"refresh_prev":   "",
			"refresh_expiry": "",
			"refresh_ua":     "",
			"refresh_ip":     "",
		},
		"$set": bson.M{
			"online":     false,
			"updated_at": time.Now(),
		},
	})
}

func FindValidRefreshSession(ctx context.Context, dbLayer db.Database, hashedToken string) (*models.User, error) {
	now := time.Now()
	var user models.User
	err := dbLayer.FindOne(ctx, UsersCollection, bson.M{
		"refresh_expiry": bson.M{"$gt": now},
		"$or": []bson.M{
			{"refresh_token": hashedToken},
			{"refresh_prev": hashedToken},
		},
	}, &user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func InvalidateUserSession(ctx context.Context, dbLayer db.Database, userID string) error {
	now := time.Now()
	return dbLayer.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refresh_token":  nil,
			"refresh_prev":   nil,
			"refresh_expiry": nil,
			"refresh_ua":     nil,
			"updated_at":     now,
		},
	})
}

func RotateRefreshTokenForUser(ctx context.Context, dbLayer db.Database, userID, newRefreshHash, prevRefreshHash, ua string) error {
	now := time.Now()
	return dbLayer.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refresh_prev":   prevRefreshHash,
			"refresh_token":  newRefreshHash,
			"refresh_expiry": now.Add(RefreshTokenTTL),
			"refresh_ua":     ua,
			"updated_at":     now,
		},
	})
}

func VerifyUserEmail(ctx context.Context, dbLayer db.Database, email string) error {
	return dbLayer.Update(ctx, UsersCollection, bson.M{"email": email}, bson.M{"$set": bson.M{"email_verified": true}})
}
