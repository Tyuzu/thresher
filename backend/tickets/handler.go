package tickets

import (
	"naevis/infra"
	"naevis/tickets/domain"
	"naevis/tickets/repo"
	"naevis/tickets/usecase"
)

func ticketRepo(app *infra.Deps) domain.TicketRepository {
	return repo.NewMongoRepo(app.DB)
}

func ticketUsecase(app *infra.Deps) *usecase.TicketUseCase {
	return usecase.NewTicketUseCase(ticketRepo(app), app.MQ)
}
