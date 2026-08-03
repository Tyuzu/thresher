package repo

import (
	"context"
	"time"

	"naevis/config"
	"naevis/infra/cache"
	db "naevis/infra/db"
	"naevis/models"
	"naevis/profile/domain"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoProfileRepo struct {
	db db.Database
	c  cache.Cache
}

func NewMongoRepo(d db.Database, c cache.Cache) domain.ProfileRepository {
	return &MongoProfileRepo{db: d, c: c}
}

func (m *MongoProfileRepo) GetUserByID(ctx context.Context, userID string) (models.User, error) {
	var u models.User
	if err := m.db.FindOne(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, &u); err != nil {
		return models.User{}, err
	}
	return u, nil
}

func (m *MongoProfileRepo) GetUserByUsername(ctx context.Context, username string) (models.User, error) {
	var u models.User
	if err := m.db.FindOne(ctx, config.Collections.UserCollection, bson.M{"username": username}, &u); err != nil {
		return models.User{}, err
	}
	return u, nil
}

func (m *MongoProfileRepo) GetUserFollowData(ctx context.Context, userID string) (models.UserFollow, error) {
	var uf models.UserFollow
	_ = m.db.FindOne(ctx, config.Collections.FollowingsCollection, bson.M{"userid": userID}, &uf)
	if uf.UserID == "" {
		return models.UserFollow{Followers: []string{}, Follows: []string{}}, nil
	}
	return uf, nil
}

func (m *MongoProfileRepo) IsOnline(ctx context.Context, userID string) (bool, error) {
	return m.c.Exists(ctx, "online:"+userID)
}

func (m *MongoProfileRepo) CacheProfile(ctx context.Context, username string, data string, ttl int64) error {
	return m.c.Set(ctx, "profile:"+username, []byte(data), time.Duration(ttl)*time.Second)
}

func (m *MongoProfileRepo) GetCachedProfile(ctx context.Context, username string) (string, error) {
	b, err := m.c.Get(ctx, "profile:"+username)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (m *MongoProfileRepo) InvalidateCachedProfile(ctx context.Context, username string) error {
	return m.c.Del(ctx, "profile:"+username)
}

func (m *MongoProfileRepo) UpdateUser(ctx context.Context, userID string, updates map[string]any) error {
	return m.db.UpdateOne(ctx, config.Collections.UserCollection, bson.M{"userid": userID}, updates)
}

func (m *MongoProfileRepo) DeleteUserByID(ctx context.Context, userID string) (int64, error) {
	return m.db.DeleteOne(ctx, config.Collections.UserCollection, bson.M{"userid": userID})
}
