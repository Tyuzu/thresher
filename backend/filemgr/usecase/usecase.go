package usecase

import (
	"context"
	"encoding/json"

	"naevis/config/mqevent"
	"naevis/filemgr/domain"
	"naevis/infra/mq"
)

type FileUsecase struct {
	repo domain.EntityRepository
	mq   mq.MQ
}

func NewFileUsecase(r domain.EntityRepository, mqClient mq.MQ) *FileUsecase {
	return &FileUsecase{repo: r, mq: mqClient}
}

func (u *FileUsecase) UpdateEntityMedia(ctx context.Context, entityType, entityId string, attachments []domain.Attachment) error {
	if len(attachments) == 0 {
		return nil
	}
	return u.repo.UpdateEntityMedia(ctx, entityType, entityId, attachments)
}

func (u *FileUsecase) PublishFileCreatedEvent(ctx context.Context, userID, entityType, entityId string, attachments []domain.Attachment) error {
	if u.mq == nil || len(attachments) == 0 {
		return nil
	}

	fileIDs := make([]string, len(attachments))
	for i, attachment := range attachments {
		fileIDs[i] = attachment.Filename
	}

	payload := mqevent.NewFileCreatedPayload(userID, entityType, entityId, fileIDs)
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	return u.mq.Publish(ctx, mqevent.FileCreatedEvent, data)
}
