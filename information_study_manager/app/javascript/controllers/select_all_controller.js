import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggle", "checkbox"]

  toggleAll() {
    this.checkboxTargets.forEach(cb => cb.checked = this.toggleTarget.checked)
    this.updateToggle()
  }

  updateToggle() {
    const all     = this.checkboxTargets.length
    const checked = this.checkboxTargets.filter(cb => cb.checked).length
    this.toggleTarget.checked       = all > 0 && checked === all
    this.toggleTarget.indeterminate = checked > 0 && checked < all
  }

  bulkDestroy(event) {
    const checked = this.checkboxTargets.filter(cb => cb.checked).length
    if (checked === 0) {
      event.preventDefault()
      event.stopImmediatePropagation()
      alert("削除するレコードを1件以上選択してください。")
    }
  }
}
