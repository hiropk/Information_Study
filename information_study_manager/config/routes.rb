Rails.application.routes.draw do
  root "attendances#index"

  resources :attendances, only: %i[index]

  namespace :api do
    namespace :v1 do
      resources :attendances, only: %i[create]
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
