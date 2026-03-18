require "rails_helper"

RSpec.describe Attendance, type: :model do
  describe "バリデーション" do
    subject(:attendance) { build(:attendance) }

    it "有効なデータで保存できる" do
      expect(attendance).to be_valid
    end

    context "必須フィールドが空の場合" do
      %i[student_code lesson_code date status].each do |attr|
        it "#{attr} がない場合は無効" do
          attendance.public_send(:"#{attr}=", nil)
          expect(attendance).not_to be_valid
          expect(attendance.errors[attr]).not_to be_empty
        end
      end
    end

    context "ユニーク制約" do
      it "同じ student_code + date の組み合わせは2件目を拒否する" do
        create(:attendance, student_code: "2-1-99", date: Date.current)
        duplicate = build(:attendance, student_code: "2-1-99", date: Date.current)
        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:student_code]).not_to be_empty
      end

      it "student_code が同じでも date が異なれば有効" do
        create(:attendance, student_code: "2-1-99", date: Date.current)
        other_day = build(:attendance, student_code: "2-1-99", date: Date.current + 1)
        expect(other_day).to be_valid
      end
    end
  end

  describe "enum" do
    it "すべての status 値が定義されている" do
      expect(Attendance.statuses.keys).to match_array(
        %w[present absent late early excused bereaved other]
      )
    end

    it "整数値と対応している" do
      expect(Attendance.statuses[:present]).to  eq 0
      expect(Attendance.statuses[:absent]).to   eq 1
      expect(Attendance.statuses[:late]).to     eq 2
      expect(Attendance.statuses[:early]).to    eq 3
      expect(Attendance.statuses[:excused]).to  eq 4
      expect(Attendance.statuses[:bereaved]).to eq 5
      expect(Attendance.statuses[:other]).to    eq 6
    end
  end

  describe ".ransackable_attributes" do
    it "期待する属性が含まれている" do
      expect(Attendance.ransackable_attributes).to include(
        "student_code", "lesson_code", "date", "status", "comment", "created_at"
      )
    end
  end
end
