Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 開発時はlocalhost、本番はGitHub PagesのURLに変更する
    origins "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://hiropk.github.io"

    resource "/api/*",
             headers: :any,
             methods: %i[post options]
  end
end
