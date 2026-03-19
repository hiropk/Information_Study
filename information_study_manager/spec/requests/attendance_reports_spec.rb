require "rails_helper"

RSpec.describe "AttendanceReports", type: :request do
  let(:today) { Date.current }

  before do
    ActionMailer::Base.deliveries.clear
    ENV["GMAIL_ADDRESS"] = "from@example.com"
    ENV["REPORT_TO"]     = "to@example.com"
  end

  after do
    ENV.delete("GMAIL_ADDRESS")
    ENV.delete("REPORT_TO")
  end

  describe "POST /attendance_reports" do
    context "正常系: 条件に一致するレコードがある場合" do
      before do
        create(:attendance, student_code: "2-1-01", date: today, status: :present)
        create(:attendance, student_code: "2-1-02", date: today, status: :absent)
      end

      it "メールを1件送信する" do
        post attendance_reports_path, params: { q: { date_eq: today.iso8601 } }
        expect(ActionMailer::Base.deliveries.size).to eq 1
      end

      it "成功フラッシュ付きで attendances_path にリダイレクトする" do
        post attendance_reports_path, params: { q: { date_eq: today.iso8601 } }

        expect(response).to redirect_to(attendances_path(q: { date_eq: today.iso8601 }))
        follow_redirect!
        expect(response.body).to include("レポートを送信しました")
      end

      it "絞り込み条件が q パラメータで引き継がれる" do
        post attendance_reports_path, params: { q: { date_eq: today.iso8601, student_code_eq: "2-1-01" } }

        expect(response).to redirect_to(
          attendances_path(q: { date_eq: today.iso8601, student_code_eq: "2-1-01" })
        )
      end
    end

    context "異常系: 条件に一致するレコードが0件の場合" do
      it "メールを送信しない" do
        post attendance_reports_path, params: { q: { date_eq: "1900-01-01" } }
        expect(ActionMailer::Base.deliveries).to be_empty
      end

      it "アラートフラッシュ付きで attendances_path にリダイレクトする" do
        post attendance_reports_path, params: { q: { date_eq: "1900-01-01" } }

        expect(response).to redirect_to(attendances_path(q: { date_eq: "1900-01-01" }))
        follow_redirect!
        expect(response.body).to include("送信対象のレコードがありません")
      end
    end
  end
end
