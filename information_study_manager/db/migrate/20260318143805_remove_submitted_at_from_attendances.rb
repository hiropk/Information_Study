class RemoveSubmittedAtFromAttendances < ActiveRecord::Migration[8.0]
  def change
    remove_column :attendances, :submitted_at, :datetime
  end
end
