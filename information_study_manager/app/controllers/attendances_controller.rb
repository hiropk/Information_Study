class AttendancesController < ApplicationController
  def index
    today = Date.current.iso8601
    @q_params = (params[:q] || {}).reverse_merge(date_eq: today, created_on: today)
    @q = Attendance.ransack(@q_params)
    @attendances         = @q.result(distinct: true).order(created_at: :desc)
    @attendances_ordered = @q.result(distinct: true).order(:student_code)
    @student_codes = Attendance.distinct.order(:student_code).pluck(:student_code)
    @lesson_codes  = Attendance.distinct.order(:lesson_code).pluck(:lesson_code)
  end

  def destroy
    @attendance = Attendance.find(params[:id])
    @attendance.destroy
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.remove(helpers.dom_id(@attendance)) }
      format.html { redirect_to attendances_path }
    end
  end

  def bulk_destroy
    ids = Array(params[:attendance_ids]).map(&:to_i)
    Attendance.where(id: ids).destroy_all if ids.any?
    redirect_to attendances_path
  end

  def bulk_create
    lesson_code   = params[:lesson_code].to_s.strip
    date          = params[:date].to_s.strip
    status        = params[:status].to_s.strip
    comment       = params[:comment].to_s.strip
    student_codes = Array(params[:student_codes]).map(&:to_s).map(&:strip).reject(&:empty?)

    created = 0
    skipped = 0

    student_codes.each do |code|
      record = Attendance.new(
        student_code: code,
        lesson_code:  lesson_code,
        date:         date,
        status:       status,
        comment:      comment.presence
      )
      record.save ? created += 1 : skipped += 1
    end

    msg = "#{created} 件の出席レコードを作成しました。"
    msg += "（#{skipped} 件はすでに存在するためスキップしました）" if skipped > 0
    redirect_to attendances_path, notice: msg
  end
end
