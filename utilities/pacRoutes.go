package main

import (
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	internalDir := "./internal"

	// Check if the internal directory exists
	if _, err := os.Stat(internalDir); os.IsNotExist(err) {
		fmt.Printf("Error: directory '%s' does not exist.\n", internalDir)
		return
	}

	// Walk through the internal directory
	err := filepath.WalkDir(internalDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Only process directories (excluding the root "internal" folder itself)
		if d.IsDir() && path != internalDir {
			pkgName := d.Name()

			// Construct filename: packageNameRoutes.go
			filename := fmt.Sprintf("%sRoutes.go", pkgName)
			filePath := filepath.Join(path, filename)

			// Generate boiler-plate Go content
			content := fmt.Sprintf("package %s\n\n// RegisterRoutes sets up HTTP routes for the %s package.\nfunc RegisterRoutes() {\n\t// TODO: Add routes\n}\n", pkgName, pkgName)

			// Create and write the file (skip if it already exists)
			if _, err := os.Stat(filePath); os.IsNotExist(err) {
				err := os.WriteFile(filePath, []byte(content), 0644)
				if err != nil {
					fmt.Printf("Failed to create %s: %v\n", filePath, err)
				} else {
					fmt.Printf("Created: %s\n", filePath)
				}
			} else {
				fmt.Printf("Skipped (already exists): %s\n", filePath)
			}
		}
		return nil
	})

	if err != nil {
		fmt.Printf("Error walking directory: %v\n", err)
	}
}
