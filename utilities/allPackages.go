package main

import (
	"fmt"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
)

func main() {
	internalDir := "./internal"

	// Check if internal directory exists
	if _, err := os.Stat(internalDir); os.IsNotExist(err) {
		fmt.Printf("Error: directory '%s' does not exist.\n", internalDir)
		return
	}

	fset := token.NewFileSet()

	err := filepath.WalkDir(internalDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			// Parse Go package info for the directory
			pkgs, err := parser.ParseDir(fset, path, nil, parser.PackageClauseOnly)
			if err != nil {
				return nil // Skip directories that can't be parsed
			}

			// Print each valid package found
			for pkgName := range pkgs {
				// fmt.Printf("Package: %-15s Path: %s\n", pkgName, path)
				fmt.Printf("%-15s\n", pkgName)
			}
		}
		return nil
	})

	if err != nil {
		fmt.Printf("Error walking directory: %v\n", err)
	}
}
