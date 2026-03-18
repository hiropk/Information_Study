class CreateAttendances < ActiveRecord::Migration[8.0]
  def change
    create_table :attendances do |t|
      t.string :student_code, null: false
      t.string :lesson_code,  null: false
      t.date :date,           null: false
      t.integer :status,      null: false
      t.text :comment
      t.datetime :submitted_at, null: false

      t.timestamps
    end

    add_index :attendances, %i[student_code date], unique: true
  end
end
