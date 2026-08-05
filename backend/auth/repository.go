package auth

import (
	"context"
	"strconv"
	"time"

	"naevis/infra"
	"naevis/models"
	log "naevis/utils/logger"
)

type Repository interface {
	GetUserByUsername(ctx context.Context, username string) (models.User, error)
	PersistUserSession(ctx context.Context, userID, hashedRefreshToken, uaHash, ipPrefix string) error
	CheckRateLimit(ctx context.Context, key string) (bool, error)
	IncrementRateLimit(ctx context.Context, key string, ttl time.Duration)
	ClearRateLimit(ctx context.Context, key string) error
}

type redisDBRepository struct {
	deps *infra.Deps
}

func NewRepository(deps *infra.Deps) Repository {
	return &redisDBRepository{deps: deps}
}

func (r *redisDBRepository) GetUserByUsername(ctx context.Context, username string) (models.User, error) {
	return FindUserByUsername(ctx, r.deps, username)
}

func (r *redisDBRepository) PersistUserSession(ctx context.Context, userID, hashedRefreshToken, uaHash, ipPrefix string) error {
	_, err := UpdateUserSession(ctx, r.deps, userID, hashedRefreshToken, uaHash, ipPrefix)
	return err
}

func (r *redisDBRepository) CheckRateLimit(ctx context.Context, key string) (bool, error) {
	val, err := r.deps.Cache.Get(ctx, key)
	if err != nil || len(val) == 0 {
		return false, nil
	}
	cnt, err := strconv.ParseInt(string(val), 10, 64)
	if err != nil {
		log.Printf("warn: failed to parse auth fail count: %v", err)
		return false, nil
	}
	return cnt >= maxFailedAttempts, nil
}

func (r *redisDBRepository) IncrementRateLimit(ctx context.Context, key string, ttl time.Duration) {
	cnt, err := r.deps.Cache.Incr(ctx, key)
	if err != nil {
		log.Printf("warn: failed to increment auth fail count: %v", err)
		cnt = 0
	}
	if err = r.deps.Cache.Set(ctx, key, []byte(strconv.FormatInt(cnt, 10)), ttl); err != nil {
		log.Printf("warn: failed to persist auth fail count: %v", err)
	}
}

func (r *redisDBRepository) ClearRateLimit(ctx context.Context, key string) error {
	if err := r.deps.Cache.Del(ctx, key); err != nil {
		log.Printf("warn: failed to clear auth fail count: %v", err)
		return err
	}
	return nil
}
