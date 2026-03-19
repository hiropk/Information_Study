Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # file:// で開いた場合の origin は "null"
    # ローカル開発用に各種ポートも許可
    origins "null",
            "http://localhost:3001",
            "http://localhost:4000",
            "http://localhost:5500",
            "http://localhost:8080",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:5500",
            "https://hiropk.github.io"

    resource "/api/*",
             headers: :any,
             methods: %i[post options]
  end
end
