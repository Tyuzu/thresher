package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env                   string
	STRIPE_WEBHOOK_SECRET string
	HTTPPort              string
	AllowedOrigins        []string
	RTMPIngestURL         string
	TURNServers           string
	CDNBaseURL            string
	TLSCertPath           string
	TLSKeyPath            string
	AllowCredentials      bool
	TerminateTLSAtLB      bool // Added to support external TLS termination
}

// InitConfig loads environment variables and performs basic validation.
// Returns an error if required configuration is missing or inconsistent.
func InitConfig() (*Config, error) {
	_ = godotenv.Load()

	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	if port[0] != ':' {
		port = ":" + port
	}

	allowedOrigins := parseAllowedOrigins(os.Getenv("ALLOWED_ORIGINS"))

	allowCreds := true
	if v := os.Getenv("ALLOW_CREDENTIALS"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			allowCreds = b
		}
	}

	// Parse TLS termination setting
	terminateTLSAtLB := true
	if v := os.Getenv("TERMINATE_TLS_AT_LB"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			terminateTLSAtLB = b
		}
	}

	cfg := &Config{
		Env:                   env,
		HTTPPort:              port,
		AllowedOrigins:        allowedOrigins,
		STRIPE_WEBHOOK_SECRET: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		RTMPIngestURL:         os.Getenv("RTMP_INGEST_URL"),
		TURNServers:           os.Getenv("TURN_SERVERS"),
		CDNBaseURL:            os.Getenv("CDN_BASE_URL"),
		TLSCertPath:           os.Getenv("TLS_CERT_PATH"),
		TLSKeyPath:            os.Getenv("TLS_KEY_PATH"),
		AllowCredentials:      allowCreds,
		TerminateTLSAtLB:      terminateTLSAtLB,
	}

	// Basic validation
	if len(cfg.AllowedOrigins) == 0 {
		return nil, errors.New("ALLOWED_ORIGINS must be set to a comma-separated list of allowed origins")
	}

	if cfg.Env == "production" {
		// ensure essential services are configured in production
		if os.Getenv("MONGO_URI") == "" {
			return nil, fmt.Errorf("MONGO_URI must be set in production")
		}
		if os.Getenv("REDIS_URL") == "" {
			return nil, fmt.Errorf("REDIS_URL must be set in production")
		}

		// Only enforce internal TLS if we aren't terminating it upstream at a load balancer
		if !cfg.TerminateTLSAtLB {
			if cfg.TLSCertPath == "" || cfg.TLSKeyPath == "" {
				return nil, fmt.Errorf("TLS_CERT_PATH and TLS_KEY_PATH must be set in production or set TERMINATE_TLS_AT_LB=true")
			}
		}

		// Do not allow wildcard origins with credentials in production
		if cfg.AllowCredentials {
			for _, o := range cfg.AllowedOrigins {
				if strings.TrimSpace(o) == "*" {
					return nil, fmt.Errorf("ALLOW_CREDENTIALS=true is incompatible with ALLOWED_ORIGINS='*' in production")
				}
			}
		}
	}

	return cfg, nil
}

func parseAllowedOrigins(env string) []string {
	if env == "" {
		return []string{"http://localhost:5173"}
	}
	parts := strings.Split(env, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
