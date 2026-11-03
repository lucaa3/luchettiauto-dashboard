const { createClient } = supabase
const supabaseUrl = "https://jgapbdkbfcdtckrnehbr.supabase.co"
const supabaseKey = "sb_publishable_41ybzHBLDKkL22GGFigqRw_rRfpiJcA"
const db = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const loginSection = document.getElementById("login-section")
const dashboardSection = document.getElementById("dashboard-section")
const inventoryView = document.getElementById("inventory-view")
const inventoryStatus = document.getElementById("inventoryStatus")
const formView = document.getElementById("form-view")
const vehiclesList = document.getElementById("vehiclesList")
const vehicleForm = document.getElementById("vehicleForm")
const auditCard = document.querySelector(".audit-card")
const imageFileInput = document.getElementById("imageFile")
const imageDropzone = document.getElementById("imageDropzone")
const imagePreview = document.getElementById("imagePreview")
const imagePreviewThumbnail = document.getElementById("imagePreviewThumbnail")
const imagePreviewName = document.getElementById("imagePreviewName")
const imageUploadError = document.getElementById("imageUploadError")
const imageModal = document.getElementById("imageModal")
const imageModalImage = document.getElementById("imageModalImage")
const imageModalClose = document.getElementById("imageModalClose")
const mfaSection = document.getElementById("mfa-section")
const mfaTitle = document.getElementById("mfaTitle")
const mfaDescription = document.getElementById("mfaDescription")
const mfaSetup = document.getElementById("mfaSetup")
const mfaQrCode = document.getElementById("mfaQrCode")
const mfaSecret = document.getElementById("mfaSecret")
const mfaForm = document.getElementById("mfaForm")
const mfaCode = document.getElementById("mfaCode")
const mfaError = document.getElementById("mfaError")
const verifyMfaBtn = document.getElementById("verifyMfaBtn")
const mfaLogoutBtn = document.getElementById("mfaLogoutBtn")
const sessionExpiryModal = document.getElementById("sessionExpiryModal")
const sessionExpiryError = document.getElementById("sessionExpiryError")
const renewSessionBtn = document.getElementById("renewSessionBtn")
const expiryLogoutBtn = document.getElementById("expiryLogoutBtn")
const dashboardLogoutError = document.getElementById("dashboardLogoutError")
const auditLogList = document.getElementById("auditLogList")
const auditLogStatus = document.getElementById("auditLogStatus")
const refreshAuditLogBtn = document.getElementById("refreshAuditLogBtn")
const auditLogFromDate = document.getElementById("auditLogFromDate")
const auditLogToDate = document.getElementById("auditLogToDate")
const auditLogAction = document.getElementById("auditLogAction")
const auditLogSort = document.getElementById("auditLogSort")
const auditLogPreviousBtn = document.getElementById("auditLogPreviousBtn")
const auditLogNextBtn = document.getElementById("auditLogNextBtn")
const auditLogPageStatus = document.getElementById("auditLogPageStatus")
const auditLogPageInput = document.getElementById("auditLogPageInput")
const auditLogGoToPageBtn = document.getElementById("auditLogGoToPageBtn")
const previewStatusDot = document.getElementById("previewStatusDot")
const previewStatusText = document.getElementById("previewStatusText")
const previewSessionError = document.getElementById("previewSessionError")
const startPreviewBtn = document.getElementById("startPreviewBtn")
const stopPreviewBtn = document.getElementById("stopPreviewBtn")
const openPreviewDropdown = document.getElementById("openPreviewDropdown")
const copyPreviewDropdown = document.getElementById("copyPreviewDropdown")
const liveWebsiteLink = document.getElementById("liveWebsiteLink")
const openPreviewLink = document.getElementById("openPreviewLink")
const copyLocalPreviewLinkBtn = document.getElementById("copyLocalPreviewLinkBtn")
const copyLivePreviewLinkBtn = document.getElementById("copyLivePreviewLinkBtn")
const isTestVehicleInput = document.getElementById("isTestVehicle")
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const IMAGE_MODAL_TRANSITION_MS = 180
const SESSION_WARNING_MS = 10 * 60 * 1000
const SESSION_INACTIVITY_LIMIT_MS = 20 * 60 * 1000
const LAST_USER_ACTIVITY_KEY = "luchetti-admin-last-activity"
const PREVIEW_URL = "http://127.0.0.1/index.html"
const LIVE_WEBSITE_URL = "https://luchettiauto.com/index.html"
const PREVIEW_QUERY_PARAM = "preview"
const AUDIT_LOG_PAGE_SIZE = 5

for (const dropdown of [openPreviewDropdown, copyPreviewDropdown]) {
  dropdown.addEventListener("toggle", () => {
    if (!dropdown.open) return
    const otherDropdown =
      dropdown === openPreviewDropdown
        ? copyPreviewDropdown
        : openPreviewDropdown
    otherDropdown.open = false
  })
}

// State tracking
let editingId = null
let existingImageUrl = null
let previewObjectUrl = null
let acceptedImageFile = null
let saveToastTimeout = null
let imageModalCloseTimeout = null
let previewSessionActive = false
let previewSessionToken = null
let sessionWarningTimeout = null
let sessionExpiryTimeout = null
let lastUserActivityAt = 0
let lastActivityStorageWriteAt = 0
let inactivityTrackingActive = false
let mfaFactorId = null
let mfaChallengeId = null
let mfaFlow = null
let mfaEnrollmentSecret = null
let mfaSetupPromise = null
let mfaChallengePromise = null
let mfaChallengeFactorId = null
let dashboardLoadedForSession = false
let auditLogPage = 0
let auditLogRequestId = 0

function clearInactivityTimers() {
  clearTimeout(sessionWarningTimeout)
  clearTimeout(sessionExpiryTimeout)
  sessionWarningTimeout = null
  sessionExpiryTimeout = null
}

function hideSessionExpiryModal() {
  sessionExpiryModal.hidden = true
  sessionExpiryError.hidden = true
  sessionExpiryError.textContent = ""
}

function getStoredUserActivityAt() {
  try {
    const storedTimestamp = Number(localStorage.getItem(LAST_USER_ACTIVITY_KEY))
    return Number.isFinite(storedTimestamp) && storedTimestamp > 0
      ? storedTimestamp
      : null
  } catch (error) {
    console.error("Could not read the inactivity timestamp:", error)
    return null
  }
}

function storeUserActivityAt(timestamp) {
  try {
    localStorage.setItem(LAST_USER_ACTIVITY_KEY, String(timestamp))
    lastActivityStorageWriteAt = timestamp
  } catch (error) {
    console.error("Could not save the inactivity timestamp:", error)
  }
}

function clearStoredUserActivity() {
  try {
    localStorage.removeItem(LAST_USER_ACTIVITY_KEY)
  } catch (error) {
    console.error("Could not clear the inactivity timestamp:", error)
  }
}

function handleSessionInactivity() {
  if (!inactivityTrackingActive) return

  const inactiveFor = Date.now() - lastUserActivityAt
  if (inactiveFor >= SESSION_INACTIVITY_LIMIT_MS) {
    clearInactivityTimers()
    void signOutAfterInactivity()
    return
  }

  if (inactiveFor >= SESSION_WARNING_MS) {
    sessionExpiryModal.hidden = false
    renewSessionBtn.focus()
    clearInactivityTimers()
    sessionExpiryTimeout = setTimeout(
      handleSessionInactivity,
      SESSION_INACTIVITY_LIMIT_MS - inactiveFor,
    )
    return
  }

  clearInactivityTimers()
  sessionWarningTimeout = setTimeout(
    handleSessionInactivity,
    Math.max(SESSION_WARNING_MS - inactiveFor, 0),
  )
  sessionExpiryTimeout = setTimeout(
    handleSessionInactivity,
    Math.max(SESSION_INACTIVITY_LIMIT_MS - inactiveFor, 0),
  )
}

async function signOutAfterInactivity() {
  try {
    const { error } = await db.auth.signOut()
    if (error) throw error
  } catch (error) {
    sessionExpiryError.textContent = `Could not end the inactive session: ${error.message}`
    sessionExpiryError.hidden = false
    renewSessionBtn.hidden = true
    sessionExpiryModal.hidden = false
    expiryLogoutBtn.focus()
  }
}

function recordUserActivity(event) {
  if (!inactivityTrackingActive) return
  if (
    event.target instanceof Element &&
    event.target.closest("#sessionExpiryModal")
  ) {
    return
  }

  lastUserActivityAt = Date.now()
  if (lastUserActivityAt - lastActivityStorageWriteAt >= 1000) {
    storeUserActivityAt(lastUserActivityAt)
  }
  hideSessionExpiryModal()
  clearInactivityTimers()
  sessionWarningTimeout = setTimeout(
    handleSessionInactivity,
    SESSION_WARNING_MS,
  )
  sessionExpiryTimeout = setTimeout(
    handleSessionInactivity,
    SESSION_INACTIVITY_LIMIT_MS,
  )
}

function startInactivityTracking() {
  if (!inactivityTrackingActive) {
    inactivityTrackingActive = true
    lastUserActivityAt = getStoredUserActivityAt() ?? Date.now()
    storeUserActivityAt(lastUserActivityAt)
  }
  handleSessionInactivity()
}

function stopInactivityTracking() {
  inactivityTrackingActive = false
  lastUserActivityAt = 0
  lastActivityStorageWriteAt = 0
  clearInactivityTimers()
  clearStoredUserActivity()
  renewSessionBtn.hidden = false
  hideSessionExpiryModal()
}

function showMfaGate() {
  loginSection.style.display = "none"
  dashboardSection.style.display = "none"
  mfaSection.hidden = false
}

function showDashboard() {
  loginSection.style.display = "none"
  mfaSection.hidden = true
  dashboardSection.style.display = "block"
  startInactivityTracking()

  if (!dashboardLoadedForSession) {
    dashboardLoadedForSession = true
    loadVehicles()
    loadPreviewSession()
    loadAuditLog()
  }
}

function showMfaError(message) {
  mfaError.textContent = message
  mfaError.hidden = false
}

async function prepareMfaChallenge(factor) {
  if (mfaChallengePromise && mfaChallengeFactorId === factor.id) {
    showMfaGate()
    return mfaChallengePromise
  }

  mfaFlow = "challenge"
  mfaError.hidden = true
  mfaError.textContent = ""
  mfaFactorId = factor.id
  mfaChallengeId = null
  mfaEnrollmentSecret = null
  mfaTitle.textContent = "Verify your identity"
  mfaDescription.textContent =
    "Enter the six-digit code from your authenticator app to continue."
  mfaSetup.hidden = true
  mfaQrCode.removeAttribute("src")
  mfaSecret.textContent = ""
  verifyMfaBtn.disabled = true
  verifyMfaBtn.textContent = "Verify code"
  showMfaGate()

  mfaChallengeFactorId = factor.id
  mfaChallengePromise = (async () => {
    try {
      const { data, error } = await db.auth.mfa.challenge({
        factorId: factor.id,
      })
      if (error) throw error
      mfaChallengeId = data.id
      verifyMfaBtn.disabled = false
      mfaCode.focus()
    } catch (error) {
      verifyMfaBtn.disabled = false
      showMfaError(
        `Could not start authenticator verification: ${error.message}`,
      )
    } finally {
      mfaChallengePromise = null
    }
  })()

  return mfaChallengePromise
}

async function prepareMfaEnrollment(unverifiedFactors) {
  mfaFlow = "enroll"
  mfaError.hidden = true
  mfaError.textContent = ""
  mfaTitle.textContent = "Set up authenticator"
  mfaDescription.textContent =
    "Scan the QR code with an authenticator app, then enter its six-digit code to secure your account."
  mfaSetup.hidden = true
  verifyMfaBtn.disabled = true
  verifyMfaBtn.textContent = "Verify and enable MFA"
  showMfaGate()

  if (mfaFactorId && mfaEnrollmentSecret) {
    mfaSetup.hidden = false
    return
  }

  if (mfaSetupPromise) return mfaSetupPromise
  mfaSetupPromise = (async () => {
    try {
      for (const factor of unverifiedFactors) {
        const { error } = await db.auth.mfa.unenroll({ factorId: factor.id })
        if (error) throw error
      }

      const { data, error } = await db.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Luchetti Auto Admin",
      })
      if (error) throw error

      mfaFactorId = data.id
      mfaEnrollmentSecret = data.totp.secret
      mfaQrCode.src = data.totp.qr_code
      mfaQrCode.hidden = false
      mfaSecret.textContent = data.totp.secret
      mfaSetup.hidden = false
      verifyMfaBtn.disabled = false
      mfaCode.focus()
    } catch (error) {
      showMfaError(`Could not set up authenticator: ${error.message}`)
    } finally {
      mfaSetupPromise = null
    }
  })()

  return mfaSetupPromise
}

async function handleAuthenticatedSession() {
  try {
    const { data: assurance, error: assuranceError } =
      await db.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) throw assuranceError

    if (assurance.currentLevel === "aal2") {
      mfaFactorId = null
      mfaChallengeId = null
      mfaFlow = null
      mfaEnrollmentSecret = null
      mfaChallengeFactorId = null
      mfaSetup.hidden = true
      mfaQrCode.removeAttribute("src")
      mfaSecret.textContent = ""
      showDashboard()
      return
    }

    const { data: factors, error: factorsError } =
      await db.auth.mfa.listFactors()
    if (factorsError) throw factorsError

    const verifiedTotp = factors.totp.find(
      (factor) => factor.status === "verified",
    )
    if (verifiedTotp) {
      if (
        mfaFlow === "challenge" &&
        mfaFactorId === verifiedTotp.id &&
        mfaChallengeId
      ) {
        showMfaGate()
        return
      }
      await prepareMfaChallenge(verifiedTotp)
      return
    }

    await prepareMfaEnrollment(
      factors.totp.filter((factor) => factor.status !== "verified"),
    )
  } catch (error) {
    showMfaGate()
    mfaTitle.textContent = "Multi-factor verification required"
    showMfaError(`Could not verify account security: ${error.message}`)
  }
}

function showLogin() {
  stopInactivityTracking()
  loginSection.style.display = "block"
  mfaSection.hidden = true
  dashboardSection.style.display = "none"
  inventoryView.style.display = "block"
  auditCard.hidden = false
  formView.style.display = "none"
  dashboardLoadedForSession = false
  mfaFactorId = null
  mfaChallengeId = null
  mfaFlow = null
  mfaEnrollmentSecret = null
  mfaChallengeFactorId = null
  mfaLogoutBtn.disabled = false
  verifyMfaBtn.disabled = false
  verifyMfaBtn.textContent = "Verify code"
  document.getElementById("loginBtn").disabled = false
  document.getElementById("loginBtn").textContent = "Secure Login"
  mfaCode.value = ""
  mfaError.hidden = true
  mfaError.textContent = ""
  mfaQrCode.removeAttribute("src")
  mfaSecret.textContent = ""
}

for (const eventName of [
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
  "input",
]) {
  document.addEventListener(eventName, recordUserActivity, { passive: true })
}

document.addEventListener("visibilitychange", () => {
  if (inactivityTrackingActive) handleSessionInactivity()
})

window.addEventListener("storage", (event) => {
  if (
    !inactivityTrackingActive ||
    event.key !== LAST_USER_ACTIVITY_KEY ||
    !event.newValue
  ) {
    return
  }

  const timestamp = Number(event.newValue)
  if (Number.isFinite(timestamp) && timestamp > lastUserActivityAt) {
    lastUserActivityAt = timestamp
    lastActivityStorageWriteAt = timestamp
    hideSessionExpiryModal()
    handleSessionInactivity()
  }
})

sessionExpiryModal.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return

  const buttons = [
    ...sessionExpiryModal.querySelectorAll(
      "button:not(:disabled):not([hidden])",
    ),
  ]
  const firstButton = buttons[0]
  const lastButton = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === firstButton) {
    event.preventDefault()
    lastButton.focus()
  } else if (!event.shiftKey && document.activeElement === lastButton) {
    event.preventDefault()
    firstButton.focus()
  }
})

function showImagePreview(src, name, isObjectUrl = false) {
  clearImagePreview()
  if (!src) return

  previewObjectUrl = isObjectUrl ? src : null
  imagePreviewThumbnail.src = src
  imagePreviewName.textContent = name
  imagePreview.hidden = false
}

function clearImagePreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  previewObjectUrl = null
  imagePreviewThumbnail.removeAttribute("src")
  imagePreview.hidden = true
}

function handleImageFile(file) {
  if (!file) return
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    restoreAcceptedImageFile()
    showImageUploadError(
      "This image is too large. Choose an image that is 5 MB or smaller.",
    )
    return
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    restoreAcceptedImageFile()
    showImageUploadError(
      "Unsupported image format. Choose a JPG, PNG, or WEBP image.",
    )
    return
  }

  imageUploadError.hidden = true
  imageUploadError.textContent = ""
  acceptedImageFile = file
  showImagePreview(URL.createObjectURL(file), file.name, true)
}

function restoreAcceptedImageFile() {
  const transfer = new DataTransfer()
  if (acceptedImageFile) transfer.items.add(acceptedImageFile)
  imageFileInput.files = transfer.files
}

function showImageUploadError(message) {
  imageUploadError.textContent = message
  imageUploadError.hidden = false
}

function showSaveToast(message) {
  const toast = document.getElementById("saveToast")
  document.getElementById("saveToastMessage").textContent = message
  toast.hidden = false
  toast.classList.remove("is-visible")
  void toast.offsetWidth
  toast.classList.add("is-visible")
  clearTimeout(saveToastTimeout)
  saveToastTimeout = setTimeout(() => {
    toast.classList.remove("is-visible")
    toast.hidden = true
  }, 3500)
}

function openImageModal() {
  if (!imagePreviewThumbnail.src) return
  clearTimeout(imageModalCloseTimeout)
  imageModal.classList.remove("is-closing")
  imageModalImage.src = imagePreviewThumbnail.src
  imageModal.hidden = false
  imageModalClose.focus()
}

function closeImageModal() {
  if (imageModal.hidden || imageModal.classList.contains("is-closing")) return

  imageModal.classList.add("is-closing")
  imageModalCloseTimeout = setTimeout(() => {
    imageModal.hidden = true
    imageModal.classList.remove("is-closing")
    imageModalImage.removeAttribute("src")
    imagePreview.focus()
  }, IMAGE_MODAL_TRANSITION_MS)
}

imageFileInput.addEventListener("change", () =>
  handleImageFile(imageFileInput.files[0]),
)

imageDropzone.addEventListener("dragover", (event) => {
  event.preventDefault()
  imageDropzone.classList.add("is-dragging")
})

imageDropzone.addEventListener("dragleave", (event) => {
  if (!imageDropzone.contains(event.relatedTarget)) {
    imageDropzone.classList.remove("is-dragging")
  }
})

imageDropzone.addEventListener("drop", (event) => {
  event.preventDefault()
  imageDropzone.classList.remove("is-dragging")
  const [file] = event.dataTransfer.files
  if (!file) return

  const transfer = new DataTransfer()
  transfer.items.add(file)
  imageFileInput.files = transfer.files
  handleImageFile(file)
})

imagePreview.addEventListener("click", openImageModal)
imageModalClose.addEventListener("click", closeImageModal)
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) closeImageModal()
})
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imageModal.hidden) closeImageModal()
})

function setPreviewSessionState(isActive, token) {
  previewSessionActive = isActive
  previewSessionToken = token ?? null
  previewStatusDot.classList.toggle("is-live", isActive)
  previewStatusDot.classList.toggle("is-offline", !isActive)
  previewStatusText.textContent = isActive
    ? "Session Active (Live)"
    : "Session Offline"
  startPreviewBtn.hidden = isActive
  stopPreviewBtn.hidden = !isActive
  openPreviewDropdown.hidden = !isActive || !token
  copyPreviewDropdown.hidden = !isActive || !token

  if (isActive && previewSessionToken) {
    const previewUrl = new URL(PREVIEW_URL)
    previewUrl.searchParams.set(PREVIEW_QUERY_PARAM, previewSessionToken)
    openPreviewLink.href = previewUrl.toString()

    const liveWebsiteUrl = new URL(LIVE_WEBSITE_URL)
    liveWebsiteUrl.searchParams.set(PREVIEW_QUERY_PARAM, previewSessionToken)
    liveWebsiteLink.href = liveWebsiteUrl.toString()
  } else {
    openPreviewLink.href = PREVIEW_URL
    liveWebsiteLink.href = LIVE_WEBSITE_URL
  }

  startPreviewBtn.disabled = isActive
  stopPreviewBtn.disabled = !isActive
}

function showPreviewSessionError(message) {
  previewSessionError.textContent = message
  previewSessionError.hidden = false
}

function clearPreviewSessionError() {
  previewSessionError.textContent = ""
  previewSessionError.hidden = true
}

async function loadPreviewSession() {
  startPreviewBtn.disabled = true
  stopPreviewBtn.disabled = true
  clearPreviewSessionError()

  const { data, error } = await db
    .from("preview_sessions")
    .select("token, is_active")
    .eq("id", 1)
    .single()

  if (error) {
    setPreviewSessionState(false, null)
    showPreviewSessionError("Could not load preview session: " + error.message)
    return
  }

  setPreviewSessionState(Boolean(data.is_active), data.token)
  if (data.is_active && !data.token) {
    showPreviewSessionError("The preview session is active but has no token.")
  }
}

async function startPreviewSession() {
  clearPreviewSessionError()
  startPreviewBtn.disabled = true
  stopPreviewBtn.disabled = true

  try {
    const newToken = crypto.randomUUID()
    const { data, error } = await db
      .from("preview_sessions")
      .update({
        is_active: true,
        token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("token, is_active")
      .single()

    if (error) throw error
    setPreviewSessionState(Boolean(data.is_active), data.token)
  } catch (error) {
    setPreviewSessionState(previewSessionActive, null)
    showPreviewSessionError("Could not start preview session: " + error.message)
  }
}

async function stopPreviewSession() {
  clearPreviewSessionError()
  startPreviewBtn.disabled = true
  stopPreviewBtn.disabled = true

  try {
    const { error } = await db
      .from("preview_sessions")
      .update({
        is_active: false,
        token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("id")
      .single()

    if (error) throw error
    setPreviewSessionState(false, null)
  } catch (error) {
    setPreviewSessionState(previewSessionActive, previewSessionToken)
    showPreviewSessionError("Could not stop preview session: " + error.message)
  }
}

async function copyPreviewLink(link, button) {
  clearPreviewSessionError()
  try {
    await navigator.clipboard.writeText(link.href)
    const originalText = button.textContent
    button.textContent = "Copied!"
    setTimeout(() => {
      button.textContent = originalText
    }, 1500)
  } catch (error) {
    showPreviewSessionError("Could not copy preview link: " + error.message)
  }
}

copyLocalPreviewLinkBtn.addEventListener("click", () =>
  copyPreviewLink(openPreviewLink, copyLocalPreviewLinkBtn),
)
copyLivePreviewLinkBtn.addEventListener("click", () =>
  copyPreviewLink(liveWebsiteLink, copyLivePreviewLinkBtn),
)

startPreviewBtn.addEventListener("click", startPreviewSession)
stopPreviewBtn.addEventListener("click", stopPreviewSession)

// --- SECURITY LOCK 1: INSTANT PAGE LOAD CHECK ---
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await db.auth.getSession()
  if (!session) {
    loginSection.style.display = "block"
    dashboardSection.style.display = "none"
  }
})

// --- AUTHENTICATION ---
db.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginSection.style.display = "none"
    dashboardSection.style.display = "none"
    setTimeout(() => {
      void handleAuthenticatedSession()
    }, 0)
  } else {
    showLogin()
    formView.style.display = "none"
    vehiclesList.replaceChildren()
    auditLogList.replaceChildren()
    auditLogStatus.textContent = "Sign in to view recent activity."
    auditLogPageStatus.textContent = ""
    auditLogPageInput.value = ""
    auditLogPageInput.disabled = true
    auditLogGoToPageBtn.disabled = true
    auditLogPage = 0
    auditLogRequestId += 1
    refreshAuditLogBtn.disabled = false
    auditLogPreviousBtn.disabled = true
    auditLogNextBtn.disabled = true
    auditLogPageInput.disabled = true
    auditLogGoToPageBtn.disabled = true
    setPreviewSessionState(false, null)
    clearPreviewSessionError()
  }
})

async function loadAuditLog() {
  const requestId = ++auditLogRequestId
  refreshAuditLogBtn.disabled = true
  if (!auditLogList.childElementCount) {
    auditLogStatus.textContent = "Loading recent activity..."
  }
  auditLogPreviousBtn.disabled = true
  auditLogNextBtn.disabled = true

  try {
    const fromDate = auditLogFromDate.value
    const toDate = auditLogToDate.value
    if (fromDate && toDate && fromDate > toDate) {
      auditLogStatus.textContent =
        "The start date must be on or before the end date."
      auditLogPageStatus.textContent = ""
      auditLogPageInput.value = ""
      auditLogList.replaceChildren()
      return
    }

    let query = db
      .from("admin_audit_log")
      .select(
        "action, entity_type, entity_id, entity_label, actor_email, changed_fields, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: auditLogSort.value === "asc" })
      .order("id", { ascending: auditLogSort.value === "asc" })

    if (fromDate) {
      query = query.gte(
        "created_at",
        new Date(`${fromDate}T00:00:00`).toISOString(),
      )
    }
    if (toDate) {
      const endDate = new Date(`${toDate}T00:00:00`)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt("created_at", endDate.toISOString())
    }
    if (auditLogAction.value) {
      query = query.eq("action", auditLogAction.value)
    }

    const firstItem = auditLogPage * AUDIT_LOG_PAGE_SIZE
    const { data, error, count } = await query.range(
      firstItem,
      firstItem + AUDIT_LOG_PAGE_SIZE - 1,
    )

    if (error) throw error
    if (requestId !== auditLogRequestId) return

    const total = count ?? data.length
    const pageCount = Math.ceil(total / AUDIT_LOG_PAGE_SIZE)
    if (total > 0 && auditLogPage >= pageCount) {
      auditLogPage = pageCount - 1
      return loadAuditLog()
    }

    if (!data.length) {
      auditLogList.replaceChildren()
      auditLogStatus.textContent = "No activity matches these filters."
      auditLogPageStatus.textContent = "Page 0 of 0"
      auditLogPageInput.value = ""
      auditLogPageInput.disabled = true
      auditLogGoToPageBtn.disabled = true
      return
    }

    const entries = document.createDocumentFragment()
    for (const entry of data) {
      const item = document.createElement("li")
      item.className = "audit-log-item"

      const summary = document.createElement("strong")
      const activeChange = entry.changed_fields?.is_active
      if (entry.entity_type === "preview_session" && activeChange) {
        summary.textContent = activeChange.after
          ? "Started development preview"
          : "Stopped development preview"
      } else {
        const actionLabel =
          {
            insert: "Created",
            update: "Edited",
            delete: "Deleted",
          }[entry.action] ?? "Changed"
        summary.textContent = `${actionLabel} ${entry.entity_label || `${entry.entity_type} #${entry.entity_id}`}`
      }

      const details = document.createElement("span")
      const changedFields = Object.keys(entry.changed_fields ?? {})
        .map((field) => field.replaceAll("_", " "))
        .join(", ")
      details.textContent = changedFields
        ? `Fields: ${changedFields}`
        : "Record changed"
      const actor = entry.actor_email ? document.createElement("span") : null
      if (actor) actor.textContent = entry.actor_email

      const timestamp = document.createElement("time")
      const date = new Date(entry.created_at)
      timestamp.dateTime = date.toISOString()
      timestamp.textContent = date.toLocaleString()

      item.append(summary, details)
      if (actor) item.append(actor)
      item.append(timestamp)
      entries.append(item)
    }

    auditLogList.replaceChildren(entries)
    const lastItem = firstItem + data.length
    auditLogStatus.textContent = `Showing ${firstItem + 1}-${lastItem} of ${total} activity entries.`
    auditLogPageStatus.textContent = `Page ${auditLogPage + 1} of ${pageCount}`
    auditLogPageInput.min = "1"
    auditLogPageInput.max = String(pageCount)
    auditLogPageInput.value = String(auditLogPage + 1)
    auditLogPageInput.disabled = pageCount <= 1
    auditLogGoToPageBtn.disabled = pageCount <= 1
    auditLogPreviousBtn.disabled = auditLogPage === 0
    auditLogNextBtn.disabled = lastItem >= total
  } catch (error) {
    if (requestId !== auditLogRequestId) return
    const setupHint = ["42P01", "PGRST205"].includes(error.code)
      ? " Run audit-log.sql in the Supabase SQL Editor to create the audit table."
      : ""
    auditLogStatus.textContent = `Could not load activity: ${error.message}.${setupHint}`
    auditLogPageStatus.textContent = ""
    auditLogPageInput.disabled = true
    auditLogGoToPageBtn.disabled = true
  } finally {
    if (requestId === auditLogRequestId) {
      refreshAuditLogBtn.disabled = false
    }
  }
}

refreshAuditLogBtn.addEventListener("click", () => loadAuditLog())
for (const filter of [
  auditLogFromDate,
  auditLogToDate,
  auditLogAction,
  auditLogSort,
]) {
  filter.addEventListener("change", () => {
    auditLogPage = 0
    void loadAuditLog()
  })
}
auditLogPreviousBtn.addEventListener("click", () => {
  if (auditLogPage === 0) return
  auditLogPage -= 1
  void loadAuditLog()
})
auditLogNextBtn.addEventListener("click", () => {
  auditLogPage += 1
  void loadAuditLog()
})
function goToAuditLogPage() {
  const pageValue = auditLogPageInput.value.trim()
  const requestedPage = Number(pageValue)
  const maxPage = Number(auditLogPageInput.max)
  if (!pageValue || !Number.isInteger(requestedPage)) {
    auditLogPageInput.value = String(auditLogPage + 1)
    auditLogStatus.textContent = "Enter a whole page number."
    return
  }

  const clampedPage = Math.min(Math.max(requestedPage, 1), maxPage)
  auditLogPageInput.value = String(clampedPage)
  auditLogPage = clampedPage - 1
  void loadAuditLog()
}
auditLogGoToPageBtn.addEventListener("click", goToAuditLogPage)
auditLogPageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") goToAuditLogPage()
})

mfaForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  mfaError.hidden = true
  const code = mfaCode.value.trim()
  if (!/^\d{6}$/.test(code)) {
    showMfaError("Enter the six-digit code from your authenticator app.")
    return
  }
  if (!mfaFactorId || !mfaFlow) {
    showMfaError("The authenticator step is not ready. Please sign in again.")
    return
  }

  verifyMfaBtn.disabled = true
  try {
    if (!mfaChallengeId) {
      const { data: challenge, error: challengeError } =
        await db.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challengeError) throw challengeError
      mfaChallengeId = challenge.id
    }

    const { error: verifyError } = await db.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code,
    })
    if (verifyError) throw verifyError

    const { data: assurance, error: assuranceError } =
      await db.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) throw assuranceError
    if (assurance.currentLevel !== "aal2") {
      throw new Error("Supabase did not confirm second-factor verification.")
    }

    mfaCode.value = ""
    mfaFlow = null
    mfaFactorId = null
    mfaChallengeId = null
    mfaEnrollmentSecret = null
    mfaChallengeFactorId = null
    mfaSetup.hidden = true
    mfaQrCode.removeAttribute("src")
    mfaSecret.textContent = ""
    showDashboard()
  } catch (error) {
    mfaChallengeId = null
    mfaCode.select()
    showMfaError(`Could not verify authenticator code: ${error.message}`)
  } finally {
    verifyMfaBtn.disabled = false
  }
})

mfaLogoutBtn.addEventListener("click", async () => {
  mfaLogoutBtn.disabled = true
  mfaError.hidden = true
  try {
    const { error } = await db.auth.signOut()
    if (error) throw error
  } catch (error) {
    showMfaError(`Could not log out: ${error.message}`)
    mfaLogoutBtn.disabled = false
  }
})

document.getElementById("loginBtn").addEventListener("click", async () => {
  const loginBtn = document.getElementById("loginBtn")
  const email = document.getElementById("adminEmail").value
  const password = document.getElementById("adminPassword").value
  const loginError = document.getElementById("loginError")
  loginError.style.display = "none"

  if (!email || !password) {
    loginError.textContent = "Please enter email and password."
    return (loginError.style.display = "block")
  }

  // 1. Grab the token that Turnstile automatically injected into the DOM
  // (Using optional chaining '?.' just in case the widget hasn't loaded yet)
  const turnstileToken = document.querySelector(
    '[name="cf-turnstile-response"]',
  )?.value

  // 2. Stop the login if they haven't passed the check
  if (!turnstileToken) {
    loginError.textContent = "Please complete the security check."
    return (loginError.style.display = "block")
  }

  loginBtn.disabled = true
  loginBtn.textContent = "Verifying..."
  try {
    const { error } = await db.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: turnstileToken,
      },
    })
    if (error) throw error
  } catch (error) {
    loginError.textContent = error.message || "Invalid credentials."
    loginError.style.display = "block"
    if (window.turnstile) {
      turnstile.reset()
    }
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = "Secure Login"
  }
})

document.getElementById("logoutBtn").addEventListener("click", async () => {
  dashboardLogoutError.hidden = true
  try {
    const { error } = await db.auth.signOut()
    if (error) throw error
  } catch (error) {
    dashboardLogoutError.textContent = `Could not log out: ${error.message}`
    dashboardLogoutError.hidden = false
  }
})

expiryLogoutBtn.addEventListener("click", async () => {
  sessionExpiryError.hidden = true
  try {
    const { error } = await db.auth.signOut()
    if (error) throw error
  } catch (error) {
    sessionExpiryError.textContent = `Could not log out: ${error.message}`
    sessionExpiryError.hidden = false
  }
})

renewSessionBtn.addEventListener("click", async () => {
  renewSessionBtn.disabled = true
  sessionExpiryError.hidden = true

  try {
    const { error } = await db.auth.refreshSession()
    if (error) {
      sessionExpiryError.textContent = `Could not renew your session: ${error.message}`
      sessionExpiryError.hidden = false
      return
    }

    lastUserActivityAt = Date.now()
    storeUserActivityAt(lastUserActivityAt)
    hideSessionExpiryModal()
    handleSessionInactivity()
  } catch (error) {
    sessionExpiryError.textContent = `Could not renew your session: ${error.message}`
    sessionExpiryError.hidden = false
  } finally {
    renewSessionBtn.disabled = false
  }
})

// --- UI TOGGLES ---
document.getElementById("showAddFormBtn").addEventListener("click", () => {
  editingId = null
  existingImageUrl = null
  acceptedImageFile = null
  vehicleForm.reset()
  isTestVehicleInput.checked = false
  clearImagePreview()
  imageUploadError.hidden = true
  imageUploadError.textContent = ""
  document.getElementById("formTitle").textContent = "Add New Vehicle"
  document.getElementById("saveBtn").textContent = "Save Vehicle"
  imageFileInput.required = true
  document.getElementById("imageOptionalText").textContent = ""

  inventoryView.style.display = "none"
  auditCard.hidden = true
  formView.style.display = "block"
})

document.getElementById("cancelBtn").addEventListener("click", () => {
  inventoryView.style.display = "block"
  auditCard.hidden = false
  formView.style.display = "none"
  acceptedImageFile = null
  clearImagePreview()
})

// --- FETCH & DISPLAY VEHICLES ---
async function loadVehicles() {
  inventoryStatus.classList.remove("is-error")
  inventoryStatus.textContent = "Loading vehicles..."
  try {
    const { data, error } = await db
      .from("vehicles")
      .select("*")
      .order("id", { ascending: false })
    if (error) throw error

    vehiclesList.replaceChildren()
    if (!data.length) {
      inventoryStatus.textContent = "No vehicles in inventory yet."
      return
    }

    inventoryStatus.textContent = ""
    data.forEach((car) => {
      const carEl = document.createElement("div")
      carEl.className = "vehicle-item"
      if (!car.is_visible) carEl.style.opacity = "0.6"

      const vehicleInfo = document.createElement("div")
      vehicleInfo.className = "vehicle-info"

      const title = document.createElement("h3")
      title.textContent = car.make_model ?? ""
      const hiddenLabel = document.createElement("span")
      hiddenLabel.dataset.field = "hidden"
      hiddenLabel.textContent = " (Hidden)"
      hiddenLabel.hidden = Boolean(car.is_visible)
      hiddenLabel.style.fontSize = "0.8rem"
      hiddenLabel.style.color = "#ff6b6b"
      hiddenLabel.style.marginLeft = "8px"
      title.appendChild(hiddenLabel)

      const details = document.createElement("p")
      details.textContent = `${car.price} - ${car.km} km`
      vehicleInfo.append(title, details)

      const testBadge = document.createElement("span")
      testBadge.dataset.field = "badge"
      testBadge.className = `vehicle-badge ${car.is_test ? "is-test" : "is-public"}`
      testBadge.textContent = car.is_test ? "TEST" : "PUBLIC"
      title.appendChild(testBadge)

      const actions = document.createElement("div")
      actions.className = "vehicle-actions"

      const visibilityLabel = document.createElement("label")
      const visibilityToggle = document.createElement("input")
      visibilityToggle.dataset.field = "visible"
      visibilityToggle.type = "checkbox"
      visibilityToggle.checked = Boolean(car.is_visible)
      visibilityToggle.addEventListener("change", () =>
        toggleVehicleVisibility(car.id, carEl),
      )
      visibilityLabel.append(
        visibilityToggle,
        document.createTextNode(" Visible"),
      )

      const testToggleLabel = document.createElement("label")
      testToggleLabel.className = "test-toggle-label"
      const testToggle = document.createElement("input")
      testToggle.dataset.field = "test"
      testToggle.type = "checkbox"
      testToggle.checked = Boolean(car.is_test)
      testToggle.setAttribute(
        "aria-label",
        `Mark ${car.make_model} as a test vehicle`,
      )
      testToggle.addEventListener("change", () =>
        toggleVehicleTest(car.id, testToggle.checked, carEl),
      )
      testToggleLabel.append(testToggle, document.createTextNode(" Test"))

      const editButton = document.createElement("button")
      editButton.className = "action-btn edit"
      editButton.textContent = "Edit"
      editButton.addEventListener("click", () => editVehicle(car.id))

      const deleteButton = document.createElement("button")
      deleteButton.className = "action-btn delete"
      deleteButton.textContent = "Delete"
      deleteButton.addEventListener("click", () => deleteVehicle(car.id))

      actions.append(visibilityLabel, testToggleLabel, editButton, deleteButton)
      carEl.append(vehicleInfo, actions)
      vehiclesList.appendChild(carEl)
    })
  } catch (error) {
    inventoryStatus.textContent = `Could not load vehicles: ${error.message}`
    inventoryStatus.classList.add("is-error")
  }
}

// --- DELETE VEHICLE ---
function getVehicleImageStoragePath(imageUrl) {
  if (!imageUrl) return null

  try {
    const imageUrlObject = new URL(imageUrl)
    if (imageUrlObject.origin !== new URL(supabaseUrl).origin) return null

    const pathname = imageUrlObject.pathname
    const match = pathname.match(/\/luchetti-image\/(.+)$/i)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

async function deleteVehicle(id) {
  if (!confirm("Are you sure you want to delete this vehicle and its photo?"))
    return

  try {
    const { data: vehicleData, error: fetchError } = await db
      .from("vehicles")
      .select("image_url")
      .eq("id", id)
      .single()

    if (fetchError) {
      throw new Error(`Could not fetch vehicle details: ${fetchError.message}`)
    }

    const { error: dbError } = await db
      .from("vehicles")
      .delete()
      .eq("id", id)
      .select("id")
      .single()
    if (dbError) {
      throw new Error(`Could not delete database record: ${dbError.message}`)
    }

    const storagePath = getVehicleImageStoragePath(vehicleData.image_url)
    if (storagePath) {
      try {
        const { error: storageError } = await db.storage
          .from("luchetti-image")
          .remove([storagePath])
        if (storageError) throw storageError
      } catch (storageError) {
        alert(
          `Vehicle deleted, but its image could not be removed: ${storageError.message}`,
        )
      }
    }

    await loadVehicles()
  } catch (error) {
    alert(error.message)
  }
}

// --- EDIT VEHICLE ---
async function editVehicle(id) {
  try {
    // 1. Fetch the exact car from the database
    const { data, error } = await db
      .from("vehicles")
      .select("*")
      .eq("id", id)
      .single()

    if (error)
      throw new Error("Error fetching vehicle details: " + error.message)

    // 2. Set the global tracking variables so the form knows we are editing
    editingId = data.id
    existingImageUrl = data.image_url

    // 3. Populate the form inputs with the fetched data
    document.getElementById("make_model").value = data.make_model
    document.getElementById("year").value = data.year
    document.getElementById("fuel").value = data.fuel
    document.getElementById("km").value = data.km
    document.getElementById("price").value = data.price
    document.getElementById("description").value = data.description
    isTestVehicleInput.checked = Boolean(data.is_test)

    // 4. Adjust the UI for editing
    imageFileInput.value = ""
    acceptedImageFile = null
    imageUploadError.hidden = true
    imageUploadError.textContent = ""
    imageFileInput.required = false // Image isn't required if they just want to fix a typo
    showImagePreview(data.image_url, "Current vehicle photo")
    document.getElementById("imageOptionalText").textContent =
      "(Leave blank to keep current photo)"
    document.getElementById("formTitle").textContent = "Edit Vehicle"
    document.getElementById("saveBtn").textContent = "Update Vehicle"

    // 5. Hide the inventory list and show the form
    inventoryView.style.display = "none"
    auditCard.hidden = true
    formView.style.display = "block"
  } catch (error) {
    alert(error.message)
  }
}

// --- FORM SUBMIT (Create or Update) ---
vehicleForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  const saveBtn = document.getElementById("saveBtn")
  const originalText = saveBtn.textContent
  saveBtn.textContent = "Saving..."
  saveBtn.disabled = true
  let uploadedStoragePath = null

  try {
    let finalImageUrl = existingImageUrl

    if (imageFileInput.files.length > 0) {
      const file = imageFileInput.files[0]
      const fileExtension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[file.type]
      if (!fileExtension) {
        throw new Error("Choose a JPG, PNG, or WEBP image.")
      }

      uploadedStoragePath = `public/${crypto.randomUUID()}.${fileExtension}`
      const { error: uploadError } = await db.storage
        .from("luchetti-image")
        .upload(uploadedStoragePath, file)

      if (uploadError) {
        uploadedStoragePath = null
        throw new Error("Image upload failed: " + uploadError.message)
      }

      const { data: urlData } = db.storage
        .from("luchetti-image")
        .getPublicUrl(uploadedStoragePath)

      finalImageUrl = urlData.publicUrl
    }

    const vehicleData = {
      make_model: document.getElementById("make_model").value,
      year: document.getElementById("year").value,
      fuel: document.getElementById("fuel").value,
      km: document.getElementById("km").value,
      price: document.getElementById("price").value,
      description: document.getElementById("description").value,
      image_url: finalImageUrl,
      is_test: isTestVehicleInput.checked,
    }

    if (editingId) {
      // Update existing record
      const { error: updateError } = await db
        .from("vehicles")
        .update(vehicleData)
        .eq("id", editingId)
        .select("id")
        .single()
      if (updateError) throw updateError
    } else {
      // Insert new record
      const { error: insertError } = await db
        .from("vehicles")
        .insert([vehicleData])
        .select("id")
        .single()
      if (insertError) throw insertError
    }

    const newStoragePath = uploadedStoragePath
    uploadedStoragePath = null
    const oldStoragePath = getVehicleImageStoragePath(existingImageUrl)
    if (newStoragePath && oldStoragePath && oldStoragePath !== newStoragePath) {
      try {
        const { error: cleanupError } = await db.storage
          .from("luchetti-image")
          .remove([oldStoragePath])
        if (cleanupError) throw cleanupError
      } catch (cleanupError) {
        alert(
          `Vehicle saved, but its previous image could not be removed: ${cleanupError.message}`,
        )
      }
    }

    document.getElementById("inventory-view").style.display = "block"
    auditCard.hidden = false
    document.getElementById("form-view").style.display = "none"

    vehicleForm.reset()
    acceptedImageFile = null
    clearImagePreview()
    imageUploadError.hidden = true
    imageUploadError.textContent = ""
    editingId = null
    existingImageUrl = null

    await loadVehicles()
    showSaveToast("Everything went smoothly.")
  } catch (error) {
    if (uploadedStoragePath) {
      try {
        const { error: cleanupError } = await db.storage
          .from("luchetti-image")
          .remove([uploadedStoragePath])
        if (cleanupError) throw cleanupError
      } catch (cleanupError) {
        alert(
          `The save failed and the uploaded image could not be cleaned up: ${cleanupError.message}`,
        )
      }
    }
    alert(error.message)
  } finally {
    saveBtn.textContent = originalText
    saveBtn.disabled = false
  }
})

function updateVehicleRowState(row, isVisible, isTest) {
  const visibilityToggle = row.querySelector('[data-field="visible"]')
  const testToggle = row.querySelector('[data-field="test"]')
  const testBadge = row.querySelector('[data-field="badge"]')
  const hiddenLabel = row.querySelector('[data-field="hidden"]')

  visibilityToggle.checked = isVisible
  testToggle.checked = isTest
  testBadge.className = `vehicle-badge ${isTest ? "is-test" : "is-public"}`
  testBadge.textContent = isTest ? "TEST" : "PUBLIC"
  hiddenLabel.hidden = isVisible
  row.style.opacity = isVisible ? "" : "0.6"
}

async function updateVehicleFlags(
  carId,
  row,
  currentVisible,
  currentTest,
  isVisible,
  isTest,
) {
  const toggles = [
    ...row.querySelectorAll('[data-field="visible"], [data-field="test"]'),
  ]
  toggles.forEach((toggle) => {
    toggle.disabled = true
  })

  try {
    const { error } = await db
      .from("vehicles")
      .update({ is_visible: isVisible, is_test: isTest })
      .eq("id", carId)
      .select("id")
      .single()
    if (error) throw error

    updateVehicleRowState(row, isVisible, isTest)
  } catch (error) {
    updateVehicleRowState(row, currentVisible, currentTest)
    alert("Error updating vehicle status: " + error.message)
  } finally {
    toggles.forEach((toggle) => {
      toggle.disabled = false
    })
  }
}

function toggleVehicleVisibility(carId, row) {
  const visibilityToggle = row.querySelector('[data-field="visible"]')
  const testToggle = row.querySelector('[data-field="test"]')
  const isVisible = visibilityToggle.checked
  const currentVisible = !isVisible
  const currentTest = testToggle.checked
  const isTest = isVisible && currentTest
  return updateVehicleFlags(
    carId,
    row,
    currentVisible,
    currentTest,
    isVisible,
    isTest,
  )
}

function toggleVehicleTest(carId, isTest, row) {
  const visibilityToggle = row.querySelector('[data-field="visible"]')
  const currentVisible = visibilityToggle.checked
  const currentTest = !isTest
  return updateVehicleFlags(
    carId,
    row,
    currentVisible,
    currentTest,
    isTest,
    isTest,
  )
}
