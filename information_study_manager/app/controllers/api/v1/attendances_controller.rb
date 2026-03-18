module Api
  module V1
    class AttendancesController < ApplicationController
      skip_before_action :verify_authenticity_token

      def create
        attendance = Attendance.find_or_initialize_by(
          student_code: attendance_params[:student_code],
          date: attendance_params[:date]
        )
        attendance.assign_attributes(attendance_params)

        if attendance.save
          Turbo::StreamsChannel.broadcast_prepend_to(
            "attendances",
            target: "attendances-list",
            partial: "attendances/attendance",
            locals: { attendance: attendance }
          )
          render json: { status: "ok" }
        else
          render json: { status: "error", message: attendance.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def attendance_params
        params.require(:attendance).permit(:student_code, :lesson_code, :date, :status, :comment)
      end
    end
  end
end
