package com.example.rushless_apk

import android.app.admin.DeviceAdminReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class KioskDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
    }
    
    companion object {
        fun getComponentName(context: Context): ComponentName {
            return ComponentName(context, KioskDeviceAdminReceiver::class.java)
        }
    }
}

