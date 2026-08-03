package infra

import (
	"context"
	"os"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/multierr"

	"naevis/config"
	"naevis/infra/cache"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/utils/logger"
)

type Deps struct {
	DB          db.Database
	Cache       cache.Cache
	MQ          mq.MQ
	NatsConn    *nats.Conn
	MongoClient *mongo.Client
	RedisClient *redis.Client
	Config      config.Config
}

/* -------------------- Constructor -------------------- */

func New(cfg *config.Config) (*Deps, error) {
	/* -------- Mongo -------- */

	mongoURI := cfg.MongoURI
	mongoDB := cfg.MongoDB

	client, database, err := NewMongo(mongoURI, mongoDB)
	if err != nil {
		return nil, err
	}

	dbLayer := db.NewMongoDatabase(database, client, 100)

	/* -------- Redis -------- */

	redisAddr := cfg.RedisAddr
	redisPassword := cfg.RedisPassword
	redisDB := cfg.RedisDB

	rclient, err := NewRedis(redisAddr, redisPassword, redisDB)
	if err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	cacheLayer := cache.NewRedisCache(rclient)

	/* -------- NATS JetStream (optional) -------- */

	var mqLayer mq.MQ = mq.NewJetStreamMQ(nil)
	var nc *nats.Conn

	natsURL := cfg.NATSURL
	if natsURL != "" {
		conn, js, err := NewJetStream(natsURL)
		if err != nil {
			_ = rclient.Close()
			_ = client.Disconnect(context.Background())
			return nil, err
		}

		mqLayer = mq.NewJetStreamMQ(js)
		nc = conn
	}

	logger.L.Sugar().Infow("infra initialized", "nats_enabled", natsURL != "")

	return &Deps{
		DB:          dbLayer,
		Cache:       cacheLayer,
		MQ:          mqLayer,
		NatsConn:    nc,
		MongoClient: client,
		RedisClient: rclient,
		Config:      *cfg,
	}, nil
}

func (d *Deps) Close(ctx context.Context) error {
	var err error

	if d.NatsConn != nil {
		if drainErr := d.NatsConn.Drain(); drainErr != nil {
			err = multierr.Append(err, drainErr)
		}
		d.NatsConn.Close()
	}

	if d.RedisClient != nil {
		if closeErr := d.RedisClient.Close(); closeErr != nil {
			err = multierr.Append(err, closeErr)
		}
	}

	if d.MongoClient != nil {
		if disconnectErr := d.MongoClient.Disconnect(ctx); disconnectErr != nil {
			err = multierr.Append(err, disconnectErr)
		}
	}

	return err
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

func NewRedis(addr string, password string, dbIndex int) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       dbIndex,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, err
	}

	return client, nil
}

/* -------------------- NATS -------------------- */

func NewJetStream(url string) (*nats.Conn, nats.JetStreamContext, error) {
	nc, err := nats.Connect(url)
	if err != nil {
		return nil, nil, err
	}

	js, err := nc.JetStream()
	if err != nil {
		_ = nc.Drain()
		return nil, nil, err
	}

	return nc, js, nil
}
