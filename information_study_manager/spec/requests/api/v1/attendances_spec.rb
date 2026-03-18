require "rails_helper"

RSpec.describe "Api::V1::Attendances", type: :request do
  let(:valid_params) do
    {
      attendance: {
        student_code: "2-1-01",
        lesson_code:  "2026-I-2-1-01",
        date:         Date.current.iso8601,
        status:       "present"
      }
    }
  end

  describe "POST /api/v1/attendances" do
    context "正常系" do
      it "新規レコードを作成して 200 を返す" do
        expect {
          post "/api/v1/attendances", params: valid_params, as: :json
        }.to change(Attendance, :count).by(1)

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["status"]).to eq "ok"
      end

      it "同じ student_code + date のレコードが既存なら更新（upsert）する" do
        existing = create(:attendance, student_code: "2-1-01", date: Date.current, status: :absent)

        expect {
          post "/api/v1/attendances",
               params: valid_params.deep_merge(attendance: { status: "present" }),
               as: :json
        }.not_to change(Attendance, :count)

        expect(response).to have_http_status(:ok)
        expect(existing.reload.status).to eq "present"
      end

      it "comment は任意なので省略しても 200 を返す" do
        post "/api/v1/attendances", params: valid_params, as: :json
        expect(response).to have_http_status(:ok)
      end

      it "comment を含めても 200 を返す" do
        params = valid_params.deep_merge(attendance: { comment: "見学" })
        post "/api/v1/attendances", params: params, as: :json
        expect(response).to have_http_status(:ok)
        expect(Attendance.last.comment).to eq "見学"
      end
    end

    context "異常系" do
      it "student_code がない場合は 422 を返す" do
        params = valid_params.deep_merge(attendance: { student_code: "" })
        post "/api/v1/attendances", params: params, as: :json

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["status"]).to eq "error"
      end

      it "無効な status 値は ArgumentError になる" do
        params = valid_params.deep_merge(attendance: { status: "invalid_value" })
        expect {
          post "/api/v1/attendances", params: params, as: :json
        }.to raise_error(ArgumentError)
      end
    end
  end
end
