class AttendancesChannel < ApplicationCable::Channel
  def subscribed
    stream_from "attendances"
  end

  def unsubscribed; end
end
