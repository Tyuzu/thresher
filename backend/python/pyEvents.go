package python

import (
	"log"
)

// sendToFlaskServerAsync fires an HTTP POST request in the background.
// It uses a detached context so parent context cancellations won't abort the Flask call.
func SendToFlaskServerAsync(data []byte) {
	log.Println(string(data))
}
