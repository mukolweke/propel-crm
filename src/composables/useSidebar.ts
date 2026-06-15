import { ref, watch } from 'vue'

const STORAGE_KEY = 'propel_sidebar_collapsed'

const collapsed = ref(false)
const mobileOpen = ref(false)
let initialized = false

function init() {
  if (initialized) return
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) collapsed.value = stored === 'true'
  initialized = true
}

watch(collapsed, (value) => {
  localStorage.setItem(STORAGE_KEY, String(value))
})

export function useSidebar() {
  init()

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function openMobile() {
    mobileOpen.value = true
  }

  function closeMobile() {
    mobileOpen.value = false
  }

  function toggleMobile() {
    mobileOpen.value = !mobileOpen.value
  }

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
    toggleMobile,
  }
}
