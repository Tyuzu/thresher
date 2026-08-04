package pay

import (
	"naevis/infra"
	uc "naevis/pay/usecase"
)

type PaymentService struct {
	app *infra.Deps
	uc  *uc.PaymentUseCase
}

func NewPaymentService(app *infra.Deps) *PaymentService {
	return &PaymentService{app: app, uc: uc.NewPaymentUseCase(app)}
}

func (p *PaymentService) RegisterResolver(entityType string, r uc.PriceResolver) {
	p.uc.RegisterResolver(entityType, r)
}

func (p *PaymentService) RegisterDefaultResolvers() {
	p.uc.RegisterDefaultResolvers()
}
