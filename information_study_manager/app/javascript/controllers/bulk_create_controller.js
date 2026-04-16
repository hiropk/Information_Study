import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "modal", "form",
    "step1", "step2",
    "lessonCode", "date", "studentCodes", "status", "comment",
    "previewBody", "previewCount"
  ]

  open() {
    this.modalTarget.classList.remove("hidden")
    document.body.style.overflow = "hidden"
    this.showStep(1)
  }

  close() {
    this.modalTarget.classList.add("hidden")
    document.body.style.overflow = ""
  }

  backdropClose(event) {
    if (event.target === this.modalTarget) this.close()
  }

  stopPropagation(event) {
    event.stopPropagation()
  }

  preview() {
    const codes = this.parseCodes(this.studentCodesTarget.value)
    if (codes.length === 0) {
      this.studentCodesTarget.setCustomValidity("出席番号を入力してください")
      this.studentCodesTarget.reportValidity()
      return
    }
    this.studentCodesTarget.setCustomValidity("")

    const lessonCode  = this.lessonCodeTarget.value.trim()
    const date        = this.dateTarget.value
    const status      = this.statusTarget.value
    const comment     = this.commentTarget.value.trim()
    const statusLabel = this.statusTarget.options[this.statusTarget.selectedIndex].text

    if (!lessonCode || !date) return

    this.previewBodyTarget.innerHTML = codes.map(code => `
      <tr>
        <td class="td-code">${this.esc(code)}</td>
        <td class="td-code td-sub">${this.esc(lessonCode)}</td>
        <td>${this.esc(date)}</td>
        <td><span class="badge badge-${this.esc(status)}">${this.esc(statusLabel)}</span></td>
        <td class="td-sub">${this.esc(comment)}</td>
      </tr>
    `).join("")

    this.previewCountTarget.textContent = `${codes.length} 件`

    // hidden フォームに値をセット
    const form = this.formTarget
    form.querySelectorAll(".bc-input").forEach(el => el.remove())
    const add = (name, value) => {
      const input = document.createElement("input")
      input.type  = "hidden"
      input.name  = name
      input.value = value
      input.className = "bc-input"
      form.appendChild(input)
    }
    add("lesson_code", lessonCode)
    add("date", date)
    add("status", status)
    add("comment", comment)
    codes.forEach(code => add("student_codes[]", code))

    this.showStep(2)
  }

  back() {
    this.showStep(1)
  }

  send() {
    this.close()
    this.formTarget.requestSubmit()
  }

  // ── private ────────────────────────────────────────────

  showStep(n) {
    this.step1Target.style.display = n === 1 ? "" : "none"
    this.step2Target.style.display = n === 2 ? "" : "none"
  }

  parseCodes(input) {
    const codes = []
    for (const part of input.split(",").map(s => s.trim()).filter(Boolean)) {
      const dash = part.indexOf("-")
      if (dash > 0) {
        const start = parseInt(part.slice(0, dash), 10)
        const end   = parseInt(part.slice(dash + 1), 10)
        if (!isNaN(start) && !isNaN(end) && start <= end)
          for (let i = start; i <= end; i++) codes.push(String(i).padStart(2, "0"))
      } else {
        const n = parseInt(part, 10)
        if (!isNaN(n)) codes.push(String(n).padStart(2, "0"))
      }
    }
    return [...new Set(codes)].sort()
  }

  esc(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
}
