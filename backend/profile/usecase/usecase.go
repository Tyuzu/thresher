package usecase

import (
	"context"

	"naevis/models"
	"naevis/profile/domain"
)

type ProfileUsecase struct {
	repo domain.ProfileRepository
}

func NewProfileUsecase(r domain.ProfileRepository) *ProfileUsecase {
	return &ProfileUsecase{repo: r}
}

func (u *ProfileUsecase) GetOwnProfile(ctx context.Context, userID string) (models.User, error) {
	return u.repo.GetUserByID(ctx, userID)
}

func (u *ProfileUsecase) GetUserProfile(ctx context.Context, username string, requesterID string) (models.User, models.UserProfileResponse, error) {
	user, err := u.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return models.User{}, models.UserProfileResponse{}, err
	}

	uf, _ := u.repo.GetUserFollowData(ctx, user.UserID)
	isFollowing := false
	for _, f := range uf.Followers {
		if f == requesterID {
			isFollowing = true
			break
		}
	}

	online, _ := u.repo.IsOnline(ctx, user.UserID)

	resp := models.UserProfileResponse{
		UserID:         user.UserID,
		Username:       user.Username,
		Email:          user.Email,
		Name:           user.Name,
		Bio:            user.Bio,
		Avatar:         user.Avatar,
		Banner:         user.Banner,
		FollowersCount: len(uf.Followers),
		FollowingCount: len(uf.Follows),
		IsFollowing:    isFollowing,
		Online:         online,
		LastLogin:      user.LastLogin,
	}

	// best-effort cache populate omitted; handlers may call repo.CacheProfile

	return user, resp, nil
}

func (u *ProfileUsecase) EditProfile(ctx context.Context, userID string, updates map[string]any) error {
	return u.repo.UpdateUser(ctx, userID, updates)
}

func (u *ProfileUsecase) DeleteProfile(ctx context.Context, userID string) (int64, error) {
	return u.repo.DeleteUserByID(ctx, userID)
}
