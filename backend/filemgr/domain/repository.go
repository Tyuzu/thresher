package domain

import "context"

type EntityRepository interface {
	UpdateEntityMedia(ctx context.Context, entityType string, entityId string, attachments []Attachment) error
}
