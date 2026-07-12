package logger

import (
	"io"
	"log"

	"go.uber.org/zap"
)

var L *zap.Logger

type zapWriter struct{}

func (z zapWriter) Write(p []byte) (n int, err error) {
	if L == nil {
		// fallback
		return len(p), nil
	}
	L.Sugar().Info(string(p))
	return len(p), nil
}

// Init initializes the global zap logger and redirects the standard log package to zap.
func Init() error {
	var err error
	cfg := zap.NewProductionConfig()
	cfg.DisableStacktrace = true
	L, err = cfg.Build()
	if err != nil {
		return err
	}

	// redirect stdlib log output to zap
	log.SetOutput(zapWriter{})
	return nil
}

// Sync flushes any buffered log entries
func Sync() error {
	if L == nil {
		return nil
	}
	return L.Sync()
}

// Writer exposes an io.Writer that writes to the zap logger
func Writer() io.Writer { return zapWriter{} }
