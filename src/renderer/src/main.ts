import { createApp } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faBookmark,
  faBookOpen,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronUp,
  faClockRotateLeft,
  faCog,
  faCopy,
  faDatabase,
  faDesktop,
  faDownload,
  faExclamationCircle,
  faExpand,
  faEye,
  faEyeSlash,
  faFeatherAlt,
  faFont,
  faInfoCircle,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faMusic,
  faPalette,
  faPlus,
  faProjectDiagram,
  faRotate,
  faServer,
  faSliders,
  faSpinner,
  faTrash,
  faWandMagicSparkles,
  faWifi
} from '@fortawesome/free-solid-svg-icons'
import App from './App.vue'
import { initAppearanceSettings } from './services/appearanceSettings'
import './styles/main.css'

library.add(
  faBookmark,
  faBookOpen,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronUp,
  faClockRotateLeft,
  faCog,
  faCopy,
  faDatabase,
  faDesktop,
  faDownload,
  faExclamationCircle,
  faExpand,
  faEye,
  faEyeSlash,
  faFeatherAlt,
  faFont,
  faInfoCircle,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faMusic,
  faPalette,
  faPlus,
  faProjectDiagram,
  faRotate,
  faServer,
  faSliders,
  faSpinner,
  faTrash,
  faWandMagicSparkles,
  faWifi
)

initAppearanceSettings()

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.mount('#app')
