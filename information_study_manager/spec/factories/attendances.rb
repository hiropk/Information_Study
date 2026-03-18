FactoryBot.define do
  factory :attendance do
    sequence(:student_code) { |n| "2-1-#{n.to_s.rjust(2, '0')}" }
    lesson_code { "2026-I-2-1-01" }
    date        { Date.current }
    status      { :present }
    comment     { nil }
  end
end
