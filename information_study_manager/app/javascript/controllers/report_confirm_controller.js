import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["modal", "form"]

  open() {
    this.modalTarget.classList.remove("hidden")
    document.body.style.overflow = "hidden"
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

  send() {
    this.close()
    this.formTarget.requestSubmit()
  }
}
