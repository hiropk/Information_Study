class Attendance < ApplicationRecord
  enum :status, {
    present:  0,
    absent:   1,
    late:     2,
    early:    3,
    excused:  4,
    bereaved: 5,
    other:    6
  }

  validates :student_code, presence: true
  validates :lesson_code,  presence: true
  validates :date,         presence: true
  validates :status,       presence: true
  validates :student_code, uniqueness: { scope: :date }

  scope :created_on, ->(date) {
    d = date.is_a?(Date) ? date : Date.parse(date.to_s)
    where(created_at: d.beginning_of_day..d.end_of_day)
  }

  def self.ransackable_attributes(auth_object = nil)
    %w[student_code lesson_code date status comment created_at]
  end

  def self.ransackable_associations(auth_object = nil)
    []
  end

  def self.ransackable_scopes(auth_object = nil)
    %i[created_on]
  end
end
