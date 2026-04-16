require "rails_helper"

RSpec.describe "Attendances", type: :request do
  let(:today) { Date.current }

  # ─── bulk_create ─────────────────────────────────────────────────────────────

  describe "POST /attendances/bulk_create" do
    let(:base_params) do
      {
        lesson_code:   "2026-I-25R",
        date:          today.iso8601,
        status:        "present",
        comment:       "一括作成テスト",
        student_codes: %w[01 02 03]
      }
    end

    context "正常系: 有効なパラメータで3件作成する" do
      it "レコードが3件増える" do
        expect {
          post bulk_create_attendances_path, params: base_params
        }.to change(Attendance, :count).by(3)
      end

      it "attendances_path にリダイレクトする" do
        post bulk_create_attendances_path, params: base_params
        expect(response).to redirect_to(attendances_path)
      end

      it "作成件数を含む notice フラッシュを返す" do
        post bulk_create_attendances_path, params: base_params
        follow_redirect!
        expect(response.body).to include("3 件の出席レコードを作成しました")
      end

      it "正しい属性でレコードが保存される" do
        post bulk_create_attendances_path, params: base_params
        record = Attendance.find_by(student_code: "01", date: today)
        expect(record).to have_attributes(
          lesson_code: "2026-I-25R",
          status:      "present",
          comment:     "一括作成テスト"
        )
      end
    end

    context "重複あり: 一部の student_code が同日に既に存在する" do
      before { create(:attendance, student_code: "01", lesson_code: "2026-I-25R", date: today) }

      it "重複しない分だけ作成される" do
        expect {
          post bulk_create_attendances_path, params: base_params
        }.to change(Attendance, :count).by(2)
      end

      it "スキップ件数を含む notice フラッシュを返す" do
        post bulk_create_attendances_path, params: base_params
        follow_redirect!
        expect(response.body).to include("1 件はすでに存在するためスキップしました")
      end
    end

    context "全件重複: すべての student_code が同日に既に存在する" do
      before do
        %w[01 02 03].each do |code|
          create(:attendance, student_code: code, lesson_code: "2026-I-25R", date: today)
        end
      end

      it "レコード数が変わらない" do
        expect {
          post bulk_create_attendances_path, params: base_params
        }.not_to change(Attendance, :count)
      end

      it "0件作成・3件スキップの notice フラッシュを返す" do
        post bulk_create_attendances_path, params: base_params
        follow_redirect!
        expect(response.body).to include("0 件の出席レコードを作成しました")
        expect(response.body).to include("3 件はすでに存在するためスキップしました")
      end
    end

    context "student_codes が空の場合" do
      it "レコードが作成されない" do
        expect {
          post bulk_create_attendances_path, params: base_params.merge(student_codes: [])
        }.not_to change(Attendance, :count)
      end

      it "attendances_path にリダイレクトする" do
        post bulk_create_attendances_path, params: base_params.merge(student_codes: [])
        expect(response).to redirect_to(attendances_path)
      end
    end
  end

  # ─── bulk_destroy ─────────────────────────────────────────────────────────────

  describe "POST /attendances/bulk_destroy" do
    let!(:a1) { create(:attendance) }
    let!(:a2) { create(:attendance) }
    let!(:a3) { create(:attendance) }

    context "正常系: 複数のIDを指定して削除する" do
      it "指定した2件が削除される" do
        expect {
          post bulk_destroy_attendances_path, params: { attendance_ids: [a1.id, a2.id] }
        }.to change(Attendance, :count).by(-2)
      end

      it "指定しなかったレコードは残る" do
        post bulk_destroy_attendances_path, params: { attendance_ids: [a1.id, a2.id] }
        expect(Attendance.exists?(a3.id)).to be true
      end

      it "attendances_path にリダイレクトする" do
        post bulk_destroy_attendances_path, params: { attendance_ids: [a1.id] }
        expect(response).to redirect_to(attendances_path)
      end
    end

    context "attendance_ids が空の場合" do
      it "レコードが削除されない" do
        expect {
          post bulk_destroy_attendances_path, params: { attendance_ids: [] }
        }.not_to change(Attendance, :count)
      end
    end

    context "存在しないIDを含む場合" do
      it "存在するIDのみ削除される" do
        expect {
          post bulk_destroy_attendances_path, params: { attendance_ids: [a1.id, 99999] }
        }.to change(Attendance, :count).by(-1)
      end
    end
  end
end
