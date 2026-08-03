package auth

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var UsersCollection = config.Collections.UserCollection

/* ============================================================
   3. REPOSITORIES (DATA ACCESS LAYER)
============================================================ */

func CreateUser(ctx context.Context, app *infra.Deps, user models.User) error {
	return app.DB.Insert(ctx, UsersCollection, user)
}

func FindUserByUsername(ctx context.Context, app *infra.Deps, username string) (models.User, error) {
	var user models.User
	if err := app.DB.FindOne(ctx, UsersCollection, bson.M{"username": username}, &user); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func UpdateUserSession(ctx context.Context, app *infra.Deps, userID, refreshTokenHash, ua, ip string) error {
	return app.DB.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refreshtoken":  refreshTokenHash,
			"refreshexpiry": time.Now().Add(RefreshTokenTTL),
			"refreshua":     ua,
			"refreship":     ip,
			"lastlogin":     time.Now(),
			"online":        true,
			"updatedat":     time.Now(),
		},
	})
}

func LogoutUserByRefreshToken(ctx context.Context, app *infra.Deps, hashedToken string) error {
	return app.DB.Update(ctx, UsersCollection, bson.M{"refresh_token": hashedToken}, bson.M{
		"$unset": bson.M{
			"refreshtoken":  "",
			"refreshexpiry": "",
		},
		"$set": bson.M{
			"online":    false,
			"updatedat": time.Now(),
		},
	})
}

func LogoutAllUserSessions(ctx context.Context, app *infra.Deps, userID string) error {
	return app.DB.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$unset": bson.M{
			"refreshtoken":  "",
			"refreshprev":   "",
			"refreshexpiry": "",
			"refreshua":     "",
			"refreship":     "",
		},
		"$set": bson.M{
			"online":    false,
			"updatedat": time.Now(),
		},
	})
}

func FindValidRefreshSession(ctx context.Context, app *infra.Deps, hashedToken string) (models.User, error) {
	now := time.Now()
	var user models.User
	err := app.DB.FindOne(ctx, UsersCollection, bson.M{
		"refreshexpiry": bson.M{"$gt": now},
		"$or": []bson.M{
			{"refreshtoken": hashedToken},
			{"refreshprev": hashedToken},
		},
	}, &user)
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

func InvalidateUserSession(ctx context.Context, app *infra.Deps, userID string) error {
	now := time.Now()
	return app.DB.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refreshtoken":  nil,
			"refreshprev":   nil,
			"refreshexpiry": nil,
			"refreshua":     nil,
			"updatedat":     now,
		},
	})
}

func RotateRefreshTokenForUser(ctx context.Context, app *infra.Deps, userID, newRefreshHash, prevRefreshHash, ua string) error {
	now := time.Now()
	return app.DB.Update(ctx, UsersCollection, bson.M{"userid": userID}, bson.M{
		"$set": bson.M{
			"refreshprev":   prevRefreshHash,
			"refreshtoken":  newRefreshHash,
			"refreshexpiry": now.Add(RefreshTokenTTL),
			"refreshua":     ua,
			"updatedat":     now,
		},
	})
}

func VerifyUserEmail(ctx context.Context, app *infra.Deps, email string) error {
	return app.DB.Update(ctx, UsersCollection, bson.M{"email": email}, bson.M{
		"$set": bson.M{
			"emailverified": true,
		},
	})
}
