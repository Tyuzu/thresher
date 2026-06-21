// dropify/filedrop/handlemediaup.go

package filemgr

import (
	"net/http"
)

func HandleMediaUpload(r *http.Request, postType string, entitytype EntityType, userid string) (paths, names []string, resolutions []int, err error) {
	switch postType {
	case "image":
		names, err = saveUploadedFiles(r, "images", "photo", entitytype, userid)
	case "video":
		var result *MediaResult
		result, err = saveUploadedVideoFile(r, "video", entitytype, userid)
		if err == nil {
			resolutions, paths, names = result.Resolutions, result.Paths, result.IDs
		}
	case "audio":
		var result *MediaResult
		result, err = saveUploadedAudioFile(r, "audio", entitytype, userid)
		if err == nil {
			resolutions, paths, names = result.Resolutions, result.Paths, result.IDs
		}
	}
	return
}

func saveUploadedVideoFile(r *http.Request, formKey string, entitytype EntityType, userid string) (*MediaResult, error) {
	return ProcessMediaUpload(r, formKey, Video, entitytype, userid)
}

func saveUploadedAudioFile(r *http.Request, formKey string, entitytype EntityType, userid string) (*MediaResult, error) {
	return ProcessMediaUpload(r, formKey, Audio, entitytype, userid)
}
