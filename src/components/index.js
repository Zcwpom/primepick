import XtxSku from './XtxSku/index.vue'
import ImageView from './ImageView/index.vue'

export const componentPlugin = {
  install(app) {
    app.component('XtxSku', XtxSku)
    app.component('XtxImageView', ImageView)
  }
}
