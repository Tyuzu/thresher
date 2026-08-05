package filemgr

func ProcessAudio(savedPath, uploadDir, uniqueID string, entitytype EntityType) ([]int, []string) {
	return processAudio(savedPath, uploadDir, uniqueID, entitytype)
}

func processAudio(savedPath, uploadDir, uniqueID string, entitytype EntityType) ([]int, []string) {
	_ = entitytype
	resolutions, outputPath := processAudioResolutions(savedPath, uploadDir, uniqueID)
	var paths []string
	if outputPath != "" {
		paths = []string{normalizePath(outputPath)}
	}
	go createSubtitleFile(uniqueID)
	return resolutions, paths
}
