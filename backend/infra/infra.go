package infra

import (
	"context"
	"os"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"naevis/config"
	"naevis/infra/cache"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/utils/logger"
)

type Deps struct {
	DB       db.Database
	Cache    cache.Cache
	MQ       mq.MQ
	NatsConn *nats.Conn
	Config   config.Config
}

/* -------------------- Constructor -------------------- */

func New(cfg *config.Config) (*Deps, error) {
	/* -------- Mongo -------- */

	mongoURI := env("MONGO_URI", "mongodb://localhost:27017")
	mongoDB := env("MONGO_DB", "eventdb")

	client, database, err := NewMongo(mongoURI, mongoDB)
	if err != nil {
		return nil, err
	}

	dbLayer := db.NewMongoDatabase(database, client, 100)

	/* -------- Redis -------- */

	redisAddr := env("REDIS_ADDR", "localhost:6379")
	redisPassword := env("REDIS_PASSWORD", "")
	redisDB := 0

	rclient := NewRedis(redisAddr, redisPassword, redisDB)
	cacheLayer := cache.NewRedisCache(rclient)

	/* -------- NATS JetStream (optional) -------- */

	var mqLayer mq.MQ = mq.NewStreamMQ()
	var nc *nats.Conn

	natsURL := env("NATS_URL", "")
	if natsURL != "" {
		// attempt to connect to NATS
		conn, err := nats.Connect(natsURL)
		if err != nil {
			return nil, err
		}

		js, err := conn.JetStream()
		if err != nil {
			_ = conn.Drain()
			return nil, err
		}

		mqLayer = mq.NewJetStreamMQ(js)
		nc = conn
	}

	logger.L.Sugar().Infow("infra initialized", "nats_enabled", natsURL != "")

	return &Deps{
		DB:       dbLayer,
		Cache:    cacheLayer,
		MQ:       mqLayer,
		NatsConn: nc,
		Config:   *cfg,
	}, nil
}

/* -------------------- Helpers -------------------- */

func env(key string, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

/* -------------------- Mongo -------------------- */

func NewMongo(uri string, dbName string) (*mongo.Client, *mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(
		ctx,
		options.Client().
			ApplyURI(uri).
			SetMaxPoolSize(100).
			SetMinPoolSize(10).
			SetRetryWrites(true),
	)
	if err != nil {
		return nil, nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, nil, err
	}

	return client, client.Database(dbName), nil
}

/* -------------------- Redis -------------------- */

func NewRedis(addr string, password string, dbIndex int) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       dbIndex,
	})
}

/* -------------------- NATS -------------------- */

// func NewJetStream(url string) (*nats.Conn, nats.JetStreamContext, error) {
// 	nc, err := nats.Connect(url)
// 	if err != nil {
// 		return nil, nil, err
// 	}

// 	js, err := nc.JetStream()
// 	if err != nil {
// 		_ = nc.Drain()
// 		return nil, nil, err
// 	}

// 	return nc, js, nil
// }
