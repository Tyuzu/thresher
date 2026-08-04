package domain

import "naevis/config"

type EntityMeta struct {
	Collection string
	IDField    string
}

var entityMeta = map[string]EntityMeta{
	"artist":   {Collection: config.Collections.ArtistsCollection, IDField: config.IDField.ArtistId},
	"baito":    {Collection: config.Collections.BaitoCollection, IDField: config.IDField.BaitoId},
	"blogpost": {Collection: config.Collections.BlogPostsCollection, IDField: config.IDField.BlogPostId},
	"chat":     {Collection: config.Collections.ChatsCollection, IDField: config.IDField.ChatId},
	"crop":     {Collection: config.Collections.CropsCollection, IDField: config.IDField.CropId},
	"event":    {Collection: config.Collections.EventsCollection, IDField: config.IDField.EventId},
	"farm":     {Collection: config.Collections.FarmsCollection, IDField: config.IDField.FarmId},
	"feedpost": {Collection: config.Collections.FeedPostsCollection, IDField: config.IDField.FeedPostId},
	"live":     {Collection: "vlive", IDField: "eventid"},
	"media":    {Collection: config.Collections.MediaCollection, IDField: config.IDField.MediaId},
	"menu":     {Collection: config.Collections.MenuCollection, IDField: config.IDField.MenuId},
	"merch":    {Collection: config.Collections.MerchCollection, IDField: config.IDField.MerchId},
	"music":    {Collection: config.Collections.AlbumsCollection, IDField: config.IDField.AlbumId},
	"place":    {Collection: config.Collections.PlacesCollection, IDField: config.IDField.PlaceId},
	"product":  {Collection: config.Collections.ProductCollection, IDField: config.IDField.ProductId},
	"recipe":   {Collection: config.Collections.RecipeCollection, IDField: config.IDField.RecipeId},
	"report":   {Collection: config.Collections.ReportsCollection, IDField: config.IDField.ReportId},
	"review":   {Collection: config.Collections.ReviewsCollection, IDField: config.IDField.ReviewId},
	"song":     {Collection: config.Collections.SongsCollection, IDField: config.IDField.SongId},
	"user":     {Collection: config.Collections.UserCollection, IDField: config.IDField.UserId},
	"vendor":   {Collection: config.Collections.VendorCollection, IDField: config.IDField.VendorId},
	"worker":   {Collection: config.Collections.BaitoWorkerCollection, IDField: config.IDField.BaitoWorkerId},
}

func GetEntityMeta(entityType string) (EntityMeta, bool) {
	meta, ok := entityMeta[entityType]
	return meta, ok
}
