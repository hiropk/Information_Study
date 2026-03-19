today = Date.current

student_codes = (1..10).map { |n| "2-1-#{n.to_s.rjust(2, '0')}" }
lesson_codes  = %w[2026-I-2-1-01 2026-I-2-1-02 2026-I-2-1-03]
statuses      = Attendance.statuses.keys

30.times do |i|
  student_code = student_codes[i % student_codes.size]
  lesson_code  = lesson_codes[i % lesson_codes.size]
  date         = today - (i / 10)
  status       = statuses.sample
  comment      = status == "other" ? "その他の理由" : nil

  Attendance.find_or_create_by(student_code: student_code, date: date) do |a|
    a.lesson_code = lesson_code
    a.status      = status
    a.comment     = comment
  end
end

puts "Seeded #{Attendance.count} attendance records."
