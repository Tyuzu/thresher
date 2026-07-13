package comments

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
)

type fakeCommentDB struct {
	comments  map[string]models.Comment
	insertErr error
	findErr   error
	updateErr error
	deleteErr error
}

func newFakeCommentDB() *fakeCommentDB {
	return &fakeCommentDB{comments: map[string]models.Comment{}}
}

func (f *fakeCommentDB) Insert(_ context.Context, _ string, document any) error {
	if f.insertErr != nil {
		return f.insertErr
	}
	comment, ok := document.(models.Comment)
	if !ok {
		return nil
	}
	if comment.CommentID == "" {
		comment.CommentID = "generated"
	}
	f.comments[comment.CommentID] = comment
	return nil
}

func (f *fakeCommentDB) FindOne(_ context.Context, _ string, filter any, result any) error {
	if f.findErr != nil {
		return f.findErr
	}
	params, ok := filter.(bson.M)
	if !ok {
		return mongo.ErrNoDocuments
	}
	commentID, _ := params["commentid"].(string)
	comment, ok := f.comments[commentID]
	if !ok {
		return mongo.ErrNoDocuments
	}
	if target, ok := result.(*models.Comment); ok {
		*target = comment
	}
	return nil
}

func (f *fakeCommentDB) FindManyWithOptions(_ context.Context, _ string, filter any, opts db.FindManyOptions, result any) error {
	if f.findErr != nil {
		return f.findErr
	}
	params, ok := filter.(bson.M)
	if !ok {
		return nil
	}
	entityType, _ := params["entity_type"].(string)
	entityID, _ := params["entity_id"].(string)
	items := make([]models.Comment, 0)
	for _, comment := range f.comments {
		if comment.EntityType == entityType && comment.EntityID == entityID {
			items = append(items, comment)
		}
	}
	if opts.Skip < len(items) {
		items = items[opts.Skip:]
	} else {
		items = []models.Comment{}
	}
	if opts.Limit > 0 && opts.Limit < len(items) {
		items = items[:opts.Limit]
	}
	if target, ok := result.(*[]models.Comment); ok {
		*target = items
	}
	return nil
}

func (f *fakeCommentDB) UpdateOne(_ context.Context, _ string, filter any, update any) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	params, ok := filter.(bson.M)
	if !ok {
		return mongo.ErrNoDocuments
	}
	commentID, _ := params["commentid"].(string)
	comment, ok := f.comments[commentID]
	if !ok {
		return mongo.ErrNoDocuments
	}
	updateMap, ok := update.(bson.M)
	if !ok {
		return nil
	}
	if content, ok := updateMap["content"].(string); ok {
		comment.Content = content
	}
	if updatedAt, ok := updateMap["updated_at"].(time.Time); ok {
		comment.UpdatedAt = updatedAt
	}
	f.comments[commentID] = comment
	return nil
}

func (f *fakeCommentDB) Delete(_ context.Context, _ string, filter any) (int64, error) {
	if f.deleteErr != nil {
		return 0, f.deleteErr
	}
	params, ok := filter.(bson.M)
	if !ok {
		return 0, nil
	}
	commentID, _ := params["commentid"].(string)
	userID, _ := params["createdby"].(string)
	comment, ok := f.comments[commentID]
	if !ok || comment.CreatedBy != userID {
		return 0, nil
	}
	delete(f.comments, commentID)
	return 1, nil
}

func (f *fakeCommentDB) Ping(context.Context) error                                { return nil }
func (f *fakeCommentDB) WithDB(context.Context, func(context.Context) error) error { return nil }
func (f *fakeCommentDB) RunTransaction(context.Context, func(context.Context) error) error {
	return nil
}
func (f *fakeCommentDB) InsertOne(context.Context, string, any) error    { return nil }
func (f *fakeCommentDB) InsertMany(context.Context, string, []any) error { return nil }
func (f *fakeCommentDB) BulkWrite(context.Context, string, []any) error  { return nil }
func (f *fakeCommentDB) FindOneWithProjection(context.Context, string, any, []string, any) error {
	return nil
}
func (f *fakeCommentDB) FindMany(context.Context, string, any, any, ...*options.FindOptions) error {
	return nil
}
func (f *fakeCommentDB) FindManyWithProjection(context.Context, string, any, []string, db.FindManyOptions, any) error {
	return nil
}
func (f *fakeCommentDB) Distinct(context.Context, string, string, any, any) error      { return nil }
func (f *fakeCommentDB) Update(context.Context, string, any, any) error                { return nil }
func (f *fakeCommentDB) UpdateMany(context.Context, string, any, any) error            { return nil }
func (f *fakeCommentDB) Upsert(context.Context, string, any, any) error                { return nil }
func (f *fakeCommentDB) Inc(context.Context, string, any, string, int64) error         { return nil }
func (f *fakeCommentDB) AddToSet(context.Context, string, any, string, any) error      { return nil }
func (f *fakeCommentDB) DeleteOne(context.Context, string, any) (int64, error)         { return 0, nil }
func (f *fakeCommentDB) DeleteMany(context.Context, string, any) error                 { return nil }
func (f *fakeCommentDB) FindOneAndUpdate(context.Context, string, any, any, any) error { return nil }
func (f *fakeCommentDB) Aggregate(context.Context, string, any, any) error             { return nil }
func (f *fakeCommentDB) Count(context.Context, string, any) (int64, error)             { return 0, nil }
func (f *fakeCommentDB) CountDocuments(context.Context, string, any) (int64, error)    { return 0, nil }
func (f *fakeCommentDB) EstimatedDocumentCount(context.Context, string) (int64, error) { return 0, nil }

func newTestDeps(dbLayer db.Database) *infra.Deps {
	return &infra.Deps{DB: dbLayer}
}

func withUserContext(r *http.Request, userID string) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), config.UserIDKey, userID))
}

func TestCreateCommentHandler(t *testing.T) {
	tests := []struct {
		name         string
		entityType   string
		body         string
		userID       string
		dbErr        error
		expectedCode int
	}{
		{name: "creates comment", entityType: "post", body: `{"content":"hello"}`, userID: "user-1", expectedCode: http.StatusCreated},
		{name: "rejects invalid entity type", entityType: "invalid", body: `{"content":"hello"}`, expectedCode: http.StatusBadRequest},
		{name: "rejects empty content", entityType: "post", body: `{"content":"   "}`, expectedCode: http.StatusBadRequest},
		{name: "handles database error", entityType: "post", body: `{"content":"hello"}`, userID: "user-1", dbErr: errors.New("boom"), expectedCode: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := newFakeCommentDB()
			fake.insertErr = tt.dbErr
			app := newTestDeps(fake)
			handler := CreateComment(app)

			req := httptest.NewRequest(http.MethodPost, "/comments", strings.NewReader(tt.body))
			if tt.userID != "" {
				req = withUserContext(req, tt.userID)
			}
			rec := httptest.NewRecorder()
			handler(rec, req, httprouter.Params{{Key: "entitytype", Value: tt.entityType}, {Key: "entityid", Value: "entity-1"}})

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestUpdateCommentHandler(t *testing.T) {
	tests := []struct {
		name         string
		comment      *models.Comment
		body         string
		userID       string
		dbErr        error
		expectedCode int
	}{
		{name: "updates owned comment", comment: &models.Comment{CommentID: "c1", CreatedBy: "user-1", Content: "old"}, body: `{"content":"new"}`, userID: "user-1", expectedCode: http.StatusOK},
		{name: "rejects other users update", comment: &models.Comment{CommentID: "c2", CreatedBy: "user-2", Content: "old"}, body: `{"content":"new"}`, userID: "user-1", expectedCode: http.StatusForbidden},
		{name: "returns not found when missing", body: `{"content":"new"}`, userID: "user-1", expectedCode: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := newFakeCommentDB()
			commentID := "c1"
			if tt.comment != nil {
				commentID = tt.comment.CommentID
				fake.comments[tt.comment.CommentID] = *tt.comment
			}
			fake.updateErr = tt.dbErr
			app := newTestDeps(fake)
			handler := UpdateComment(app)

			req := httptest.NewRequest(http.MethodPut, "/comments/"+commentID, strings.NewReader(tt.body))
			req = withUserContext(req, tt.userID)
			rec := httptest.NewRecorder()
			handler(rec, req, httprouter.Params{{Key: "commentid", Value: commentID}})

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestDeleteCommentHandler(t *testing.T) {
	tests := []struct {
		name         string
		comment      *models.Comment
		userID       string
		expectedCode int
	}{
		{name: "deletes owned comment", comment: &models.Comment{CommentID: "c1", CreatedBy: "user-1"}, userID: "user-1", expectedCode: http.StatusNoContent},
		{name: "rejects delete from other user", comment: &models.Comment{CommentID: "c2", CreatedBy: "user-2"}, userID: "user-1", expectedCode: http.StatusForbidden},
		{name: "returns forbidden when missing", userID: "user-1", expectedCode: http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := newFakeCommentDB()
			if tt.comment != nil {
				fake.comments[tt.comment.CommentID] = *tt.comment
			}
			app := newTestDeps(fake)
			handler := DeleteComment(app)

			req := httptest.NewRequest(http.MethodDelete, "/comments/c1", nil)
			req = withUserContext(req, tt.userID)
			rec := httptest.NewRecorder()
			handler(rec, req, httprouter.Params{{Key: "commentid", Value: "c1"}})

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestGetCommentHandler(t *testing.T) {
	tests := []struct {
		name         string
		comment      *models.Comment
		expectedCode int
	}{
		{name: "returns comment", comment: &models.Comment{CommentID: "c1", Content: "hello"}, expectedCode: http.StatusOK},
		{name: "returns not found", expectedCode: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := newFakeCommentDB()
			if tt.comment != nil {
				fake.comments[tt.comment.CommentID] = *tt.comment
			}
			app := newTestDeps(fake)
			handler := GetComment(app)

			req := httptest.NewRequest(http.MethodGet, "/comments/c1", nil)
			rec := httptest.NewRecorder()
			handler(rec, req, httprouter.Params{{Key: "commentid", Value: "c1"}})

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestGetCommentsHandler(t *testing.T) {
	tests := []struct {
		name         string
		entityType   string
		entityID     string
		comments     []models.Comment
		expectedCode int
	}{
		{name: "returns comments list", entityType: "post", entityID: "entity-1", comments: []models.Comment{{CommentID: "c1", EntityType: "post", EntityID: "entity-1", Content: "hello"}}, expectedCode: http.StatusOK},
		{name: "rejects missing entity id", entityType: "post", expectedCode: http.StatusBadRequest},
		{name: "rejects invalid entity type", entityType: "invalid", entityID: "entity-1", expectedCode: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fake := newFakeCommentDB()
			for _, comment := range tt.comments {
				fake.comments[comment.CommentID] = comment
			}
			app := newTestDeps(fake)
			handler := GetComments(app)

			req := httptest.NewRequest(http.MethodGet, "/comments", nil)
			rec := httptest.NewRecorder()
			handler(rec, req, httprouter.Params{{Key: "entitytype", Value: tt.entityType}, {Key: "entityid", Value: tt.entityID}})

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}
			if tt.expectedCode == http.StatusOK {
				var response []models.Comment
				if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
					t.Fatalf("expected a valid JSON array: %v", err)
				}
				if len(response) != len(tt.comments) {
					t.Fatalf("expected %d comments, got %d", len(tt.comments), len(response))
				}
			}
		})
	}
}
