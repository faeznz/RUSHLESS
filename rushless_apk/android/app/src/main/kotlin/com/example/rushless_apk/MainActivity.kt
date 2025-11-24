package com.example.rushless_apk

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.rushless_apk/lock"
    private val REQUEST_CODE_ENABLE_ADMIN = 1001
    private val PREFS_NAME = "rushless_prefs"
    private val KEY_ADMIN_REQUESTED = "admin_requested"
    private var isLocked = false
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var sharedPreferences: SharedPreferences
    private var blockingView: View? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Device Policy Manager
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, KioskDeviceAdminReceiver::class.java)
        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        // Check and request Device Admin permission on first launch
        checkAndRequestDeviceAdmin()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "setLocked" -> {
                    isLocked = call.argument<Boolean>("locked") ?: false
                    if (isLocked) {
                        enableKioskMode()
                    } else {
                        disableKioskMode()
                    }
                    result.success(null)
                }
                "checkDeviceAdmin" -> {
                    val isAdminActive = devicePolicyManager.isAdminActive(adminComponent)
                    result.success(isAdminActive)
                }
                "requestDeviceAdmin" -> {
                    requestDeviceAdminPermission()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }
    
    private fun checkAndRequestDeviceAdmin() {
        // Check if Device Admin is already enabled
        if (devicePolicyManager.isAdminActive(adminComponent)) {
            return // Already enabled, no need to request
        }
        
        // Check if we've already requested before
        val hasRequested = sharedPreferences.getBoolean(KEY_ADMIN_REQUESTED, false)
        
        // Request permission on first launch (after a short delay to let UI load)
        if (!hasRequested) {
            handler.postDelayed({
                requestDeviceAdminPermission()
            }, 1000) // Wait 1 second for UI to load
        }
    }
    
    private fun requestDeviceAdminPermission() {
        if (devicePolicyManager.isAdminActive(adminComponent)) {
            return // Already enabled
        }
        
        // Mark that we've requested
        sharedPreferences.edit().putBoolean(KEY_ADMIN_REQUESTED, true).apply()
        
        // Request device admin permission
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
            "Aplikasi memerlukan Device Admin untuk:\n\n" +
            "• Mengaktifkan mode kiosk\n" +
            "• Memblokir tombol navigasi (Home, Back, Recent Apps)\n" +
            "• Mencegah keluar dari aplikasi saat ujian\n\n" +
            "Silakan aktifkan untuk melanjutkan.")
        try {
            startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN)
        } catch (e: Exception) {
            // Handle error if activity cannot be started
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_ENABLE_ADMIN) {
            if (devicePolicyManager.isAdminActive(adminComponent)) {
                // Device admin enabled successfully
                // If kiosk mode was requested, enable it now
                if (isLocked) {
                    enableKioskMode()
                }
            } else {
                // User declined or cancelled Device Admin permission
                // Mark as requested so we don't keep asking
                sharedPreferences.edit().putBoolean(KEY_ADMIN_REQUESTED, true).apply()
            }
        }
    }

    private fun enableKioskMode() {
        // Check if device admin is enabled
        if (!devicePolicyManager.isAdminActive(adminComponent)) {
            // Request device admin permission
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
                "Aplikasi memerlukan Device Admin untuk mengaktifkan mode kiosk")
            startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN)
            return
        }
        
        // Try to enable lock task mode (kiosk mode)
        // Note: setLockTaskPackages requires device owner, so we skip it for regular apps
        // We'll use startLockTask() directly which may work on some devices
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                if (devicePolicyManager.isLockTaskPermitted(packageName)) {
                    // Only start lock task if device owner allows it, so Android
                    // doesn't show "App pinned" notification/toast
                    startLockTask()
                } else {
                    android.util.Log.d("KioskMode", "Lock task not permitted for this package, using fallback.")
                }
            } catch (e: Exception) {
                // If lock task fails (most common case), we'll use fallback methods
                // This is expected for regular apps without device owner permission
                android.util.Log.d("KioskMode", "Lock task not available, using fallback methods: ${e.message}")
            }
        }
        
        // Hide system bars (notification bar and navigation bar) for kiosk mode
        hideSystemBars()
        
        // Add blocking view to prevent notification bar swipe
        addNotificationBarBlockingView()
        
        // Set up listener to detect when system bars appear
        setupSystemUiVisibilityListener()
        
        // Start monitoring untuk bring app to front jika user mencoba keluar
        // This is a fallback if lock task mode doesn't fully work
        startKioskMonitoring()
    }

    private fun disableKioskMode() {
        // Try to stop lock task mode (if it was active)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && devicePolicyManager.isLockTaskPermitted(packageName)) {
            try {
                stopLockTask()
            } catch (e: Exception) {
                // Ignore errors - lock task may not have been active
            }
        }
        
        // Remove blocking view
        removeNotificationBarBlockingView()
        
        // Remove system UI visibility listener
        removeSystemUiVisibilityListener()
        
        // Show system bars
        showSystemBars()
        
        // Stop monitoring
        stopKioskMonitoring()
    }
    
    private fun hideSystemBars() {
        // Hide notification bar and navigation bar for kiosk mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_DEFAULT
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
        }
    }
    
    private fun showSystemBars() {
        // Show system bars when exiting kiosk mode
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }
    
    private fun addNotificationBarBlockingView() {
        if (blockingView != null) return
        
        window.decorView.post {
            try {
                val decorView = window.decorView as? ViewGroup ?: return@post
                if (blockingView != null) return@post
                
                val screenHeight = resources.displayMetrics.heightPixels
                val statusBarHeight = getStatusBarHeight()
                // Only cover status bar area (top 5-8% of screen) to avoid blocking AppBar
                // AppBar is typically around 56dp, so we only block above it
                val blockingHeight = maxOf(statusBarHeight + 20, (screenHeight * 0.08).toInt())
                
                blockingView = View(this@MainActivity).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        blockingHeight
                    )
                    setBackgroundColor(android.graphics.Color.TRANSPARENT)
                    // Intercept touch events only in status bar area, not AppBar
                    setOnTouchListener { view, event ->
                        val y = event.rawY
                        // Only block if touch is in status bar area (top 5% of screen)
                        if (y < screenHeight * 0.05) {
                            true // Consume events in status bar area
                        } else {
                            false // Allow events to pass through to AppBar
                        }
                    }
                    isClickable = true
                    isFocusable = true
                    isFocusableInTouchMode = true
                    elevation = 10000f
                }
                
                decorView.addView(blockingView, decorView.childCount)
                blockingView?.bringToFront()
            } catch (e: Exception) {
                // Continue without blocking view if there's an error
            }
        }
    }
    
    private fun getStatusBarHeight(): Int {
        var result = 0
        val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
        if (resourceId > 0) {
            result = resources.getDimensionPixelSize(resourceId)
        }
        return result
    }
    
    private fun removeNotificationBarBlockingView() {
        blockingView?.let { view ->
            try {
                val decorView = window.decorView as? ViewGroup
                decorView?.removeView(view)
            } catch (e: Exception) {
                // Ignore errors when removing
            }
            blockingView = null
        }
    }
    
    private var systemUiVisibilityListener: View.OnSystemUiVisibilityChangeListener? = null
    
    private fun setupSystemUiVisibilityListener() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            systemUiVisibilityListener = View.OnSystemUiVisibilityChangeListener { visibility ->
                if (isLocked) {
                    handler.postDelayed({
                        if (isLocked) {
                            hideSystemBars()
                        }
                    }, 100)
                }
            }
            window.decorView.setOnSystemUiVisibilityChangeListener(systemUiVisibilityListener)
        } else {
            window.decorView.setOnApplyWindowInsetsListener { view, insets ->
                if (isLocked) {
                    val statusBarsVisible = insets.isVisible(WindowInsets.Type.statusBars())
                    if (statusBarsVisible) {
                        handler.postDelayed({
                            if (isLocked) {
                                hideSystemBars()
                            }
                        }, 100)
                    }
                }
                view.onApplyWindowInsets(insets)
            }
        }
    }
    
    private fun removeSystemUiVisibilityListener() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            window.decorView.setOnSystemUiVisibilityChangeListener(null)
        } else {
            window.decorView.setOnApplyWindowInsetsListener(null)
        }
        systemUiVisibilityListener = null
    }

    private var isInForeground = true

    private var lastSystemBarHide = 0L
    private val SYSTEM_BAR_HIDE_INTERVAL = 2000L // Hide system bars every 2 seconds
    
    private val kioskRunnable = object : Runnable {
        override fun run() {
            if (!isLocked) return
            
            // Kiosk mode monitoring: check if app is still in foreground
            if (!isInForeground) {
                // App is not in foreground, bring it back (kiosk mode requirement)
                handler.post {
                    bringToFront()
                }
            }
            
            // Periodically hide system bars to prevent notification bar from appearing
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastSystemBarHide > SYSTEM_BAR_HIDE_INTERVAL) {
                handler.post {
                    hideSystemBars()
                }
                lastSystemBarHide = currentTime
            }
            
            // Ensure blocking view exists
            if (blockingView == null) {
                handler.post {
                    addNotificationBarBlockingView()
                }
            }
            
            // Monitor every 2 seconds to ensure kiosk mode is maintained
            handler.postDelayed(this, 2000)
        }
    }

    private fun bringToFront() {
        // Kiosk mode: Ensure app stays in foreground
        try {
            val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            // Move task to front - works for same app without special permission
            activityManager.moveTaskToFront(taskId, 0)
        } catch (e: Exception) {
            // Fallback: use Intent to bring activity to front (kiosk mode fallback)
            try {
                val intent = packageManager.getLaunchIntentForPackage(packageName)
                intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                startActivity(intent)
            } catch (e2: Exception) {
                // Last resort: restart current activity (kiosk mode recovery)
                val intent = Intent(this, MainActivity::class.java)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                startActivity(intent)
            }
        }
    }

    private fun startKioskMonitoring() {
        handler.post(kioskRunnable)
    }

    private fun stopKioskMonitoring() {
        handler.removeCallbacks(kioskRunnable)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Block semua tombol sistem saat kiosk mode aktif
        if (isLocked) {
            when (keyCode) {
                KeyEvent.KEYCODE_BACK -> {
                    // Block back button - kiosk mode prevents navigation
                    return true
                }
                KeyEvent.KEYCODE_HOME -> {
                    // Block home button - kiosk mode keeps app in foreground
                    return true
                }
                KeyEvent.KEYCODE_APP_SWITCH -> {
                    // Block recent apps button - kiosk mode prevents app switching
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onBackPressed() {
        // Block back button saat kiosk mode aktif
        if (isLocked) {
            // Do nothing - kiosk mode prevents back navigation
            return
        }
        super.onBackPressed()
    }

    override fun onUserLeaveHint() {
        // Dipanggil ketika user menekan home button atau recent apps
        // In kiosk mode, this should not happen, but handle it as fallback
        if (isLocked) {
            // Kiosk mode: Prevent app dari going to background
            handler.postDelayed({
                if (isLocked) {
                    bringToFront()
                }
            }, 50)
        }
        super.onUserLeaveHint()
    }

    override fun onPause() {
        super.onPause()
        isInForeground = false
        if (isLocked) {
            // Kiosk mode: Jika app di-pause, bring back to front immediately
            handler.post({
                if (isLocked) {
                    bringToFront()
                }
            })
        }
    }

    override fun onResume() {
        super.onResume()
        isInForeground = true
        if (isLocked) {
            // Kiosk mode: Pastikan lock task mode masih aktif saat resume
            enableKioskMode()
        }
    }
    
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        isInForeground = hasFocus
        if (isLocked && hasFocus) {
            // Kiosk mode: Pastikan system bars tetap tersembunyi saat focus kembali
            handler.post {
                hideSystemBars()
            }
        }
        if (isLocked && !hasFocus) {
            // Kiosk mode: Jika kehilangan focus, bring back to front
            handler.postDelayed({
                if (isLocked) {
                    bringToFront()
                }
            }, 50)
        }
    }
    
    private var touchStartY = 0f
    private var isBlockingGesture = false
    
    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        if (!isLocked || ev == null) {
            return super.dispatchTouchEvent(ev)
        }
        
        val screenHeight = resources.displayMetrics.heightPixels
        val touchY = ev.rawY
        val action = ev.action and MotionEvent.ACTION_MASK
        
        // Only block touches in status bar area (top 5% of screen)
        // Allow touches in AppBar area (around top 5-15% of screen) to pass through
        val statusBarArea = screenHeight * 0.05
        val appBarArea = screenHeight * 0.15
        val isInStatusBarArea = touchY < statusBarArea
        val isInAppBarArea = touchY < appBarArea && touchY >= statusBarArea
        
        when (action) {
            MotionEvent.ACTION_DOWN -> {
                touchStartY = touchY
                isBlockingGesture = false
                
                // Only block if in status bar area, not AppBar
                if (isInStatusBarArea) {
                    isBlockingGesture = true
                    handler.post {
                        hideSystemBars()
                    }
                    return true // Block notification bar swipe
                }
                // Allow AppBar touches to pass through
                if (isInAppBarArea) {
                    return super.dispatchTouchEvent(ev)
                }
            }
            
            MotionEvent.ACTION_MOVE -> {
                if (isBlockingGesture) {
                    return true // Continue blocking status bar area
                }
                
                // Only block if in status bar area
                if (isInStatusBarArea) {
                    isBlockingGesture = true
                    return true
                }
                
                // Allow AppBar touches to pass through
                if (isInAppBarArea) {
                    return super.dispatchTouchEvent(ev)
                }
                
                // Block downward swipe from status bar area (notification bar gesture)
                val deltaY = touchY - touchStartY
                if (touchStartY < statusBarArea && deltaY > 30) {
                    isBlockingGesture = true
                    handler.post {
                        hideSystemBars()
                    }
                    return true
                }
            }
            
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (isBlockingGesture) {
                    isBlockingGesture = false
                    return true
                }
            }
        }
        
        // Final check: only block touches in status bar area, allow AppBar
        if (isInStatusBarArea) {
            return true
        }
        
        return super.dispatchTouchEvent(ev)
    }

    override fun onDestroy() {
        stopKioskMonitoring()
        super.onDestroy()
    }
}
