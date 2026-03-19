class ApplicationMailer < ActionMailer::Base
  default from: -> { ENV["GMAIL_ADDRESS"] || Rails.application.credentials.dig(:gmail, :address) }
  layout "mailer"
end
