require "rails_helper"

RSpec.describe AttendanceReportMailer, type: :mailer do
  let(:today) { Date.current }
  let(:attendances) do
    [
      build_stubbed(:attendance, student_code: "2-1-01", lesson_code: "2026-I-2-1-01",
                                 date: today, status: :present, comment: nil),
      build_stubbed(:attendance, student_code: "2-1-02", lesson_code: "2026-I-2-1-01",
                                 date: today, status: :late,    comment: "電車遅延"),
      build_stubbed(:attendance, student_code: "2-1-03", lesson_code: "2026-I-2-1-01",
                                 date: today, status: :absent,  comment: nil),
    ]
  end
  let(:q_params) { { date_eq: today.iso8601 } }

  subject(:mail) { described_class.report(attendances, q_params) }

  describe "メタ情報" do
    before { ENV["REPORT_TO"] = "test-report@example.com" }
    after  { ENV.delete("REPORT_TO") }

    it "宛先が REPORT_TO 環境変数になっている" do
      expect(mail.to).to eq ["test-report@example.com"]
    end

    it "件名に日付が含まれる" do
      expect(mail.subject).to include(today.iso8601)
      expect(mail.subject).to start_with("出席レポート")
    end
  end

  describe "本文" do
    it "送信日時が含まれる" do
      expect(mail.body.encoded).to include("送信日時")
    end

    it "授業日が含まれる" do
      expect(mail.body.encoded).to include(today.iso8601)
    end

    it "全学籍番号が含まれる" do
      attendances.each do |a|
        expect(mail.body.encoded).to include(a.student_code)
      end
    end

    it "状態の日本語訳が含まれる" do
      expect(mail.body.encoded).to include("出席")
      expect(mail.body.encoded).to include("遅刻")
      expect(mail.body.encoded).to include("欠席")
    end

    it "備考が含まれる" do
      expect(mail.body.encoded).to include("電車遅延")
    end

    it "件数が含まれる" do
      expect(mail.body.encoded).to include("3 件")
    end
  end

  describe "絞り込み条件なし（date_eq なし）" do
    subject(:mail) { described_class.report(attendances, {}) }

    it "件名に本日日付が含まれる" do
      expect(mail.subject).to include(Time.current.strftime("%Y-%m-%d"))
    end
  end
end
