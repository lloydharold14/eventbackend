# Compose Multiplatform Integration Guide

## Overview

This guide provides comprehensive integration instructions for connecting your **Compose Multiplatform** mobile application with the **Event Management Platform**. The platform provides optimized APIs specifically designed for mobile applications, including offline sync, push notifications, location services, and mobile-optimized data formats.

## 🚀 **Quick Start**

### 1. **Base Configuration**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/config/PlatformConfig.kt
object PlatformConfig {
    const val API_BASE_URL = "https://your-api-gateway-url.amazonaws.com/dev"
    const val MOBILE_API_BASE_URL = "$API_BASE_URL/mobile"
    
    // API Endpoints
    object Endpoints {
        const val SYNC = "/sync"
        const val EVENTS = "/events"
        const val USER = "/user"
        const val BOOKINGS = "/bookings"
        const val PAYMENTS = "/payments"
        const val SEARCH = "/search"
        const val NEARBY = "/nearby"
        const val PUSH_TOKEN = "/push-token"
        const val ANALYTICS = "/analytics"
        const val HEALTH = "/health"
    }
}
```

### 2. **Authentication Setup**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/auth/AuthManager.kt
class AuthManager {
    private var accessToken: String? = null
    private var refreshToken: String? = null
    
    fun setTokens(accessToken: String, refreshToken: String) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
    }
    
    fun getAuthHeaders(): Map<String, String> {
        return mapOf(
            "Authorization" to "Bearer $accessToken",
            "Content-Type" to "application/json",
            "Accept-Language" to getCurrentLocale(),
            "X-User-Currency" to getCurrentCurrency(),
            "X-User-Region" to getCurrentRegion(),
            "X-User-Timezone" to getCurrentTimezone(),
            "X-Device-ID" to getDeviceId(),
            "X-Platform" to getPlatform(),
            "X-App-Version" to getAppVersion()
        )
    }
}
```

## 📱 **Core Mobile APIs**

### 1. **Data Synchronization**

**Endpoint:** `POST /mobile/sync`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/api/MobileSyncApi.kt
@Serializable
data class MobileSyncRequest(
    val lastSyncTimestamp: String,
    val deviceId: String,
    val syncTypes: List<String>, // "events", "bookings", "payments", "notifications", "user"
    val offlineChanges: List<OfflineChange>? = null
)

@Serializable
data class MobileSyncResponse(
    val lastSyncTimestamp: String,
    val changes: Map<String, List<Any>>,
    val conflicts: List<SyncConflict>? = null
)

class MobileSyncApi {
    suspend fun syncData(request: MobileSyncRequest): MobileSyncResponse {
        return httpClient.post("${PlatformConfig.MOBILE_API_BASE_URL}${PlatformConfig.Endpoints.SYNC}") {
            setBody(request)
            headers {
                appendAll(authManager.getAuthHeaders())
            }
        }.body()
    }
}
```

### 2. **Mobile-Optimized Events**

**Endpoint:** `GET /mobile/events`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/models/MobileEvent.kt
@Serializable
data class MobileEvent(
    val id: String,
    val title: String,
    val shortDescription: String?,
    val description: String,
    val startDate: String,
    val endDate: String,
    val location: MobileEventLocation,
    val organizer: MobileEventOrganizer,
    val category: String,
    val pricing: MobileEventPricing,
    val images: MobileEventImages,
    val status: String,
    val maxAttendees: Int,
    val currentAttendees: Int,
    val tags: List<String>,
    val features: List<String>,
    val isBookmarked: Boolean,
    val isNearby: Boolean,
    val distance: Double?,
    val localContent: MobileEventLocalContent
)

@Serializable
data class MobileEventLocation(
    val address: String,
    val city: String,
    val state: String,
    val country: String,
    val coordinates: Coordinates?,
    val venue: Venue?
)

@Serializable
data class MobileEventPricing(
    val currency: String,
    val basePrice: Double,
    val displayPrice: String,
    val tiers: List<PricingTier>?
)

@Serializable
data class MobileEventLocalContent(
    val title: String,
    val description: String,
    val currency: String,
    val formattedPrice: String
)
```

### 3. **Push Notifications**

**Endpoint:** `POST /mobile/push-token`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/notifications/PushNotificationManager.kt
@Serializable
data class PushNotificationToken(
    val userId: String,
    val deviceId: String,
    val platform: String, // "android", "ios", "desktop", "web"
    val token: String,
    val isActive: Boolean = true,
    val preferences: NotificationPreferences = NotificationPreferences()
)

@Serializable
data class NotificationPreferences(
    val events: Boolean = true,
    val bookings: Boolean = true,
    val payments: Boolean = true,
    val marketing: Boolean = false,
    val reminders: Boolean = true
)

class PushNotificationManager {
    suspend fun registerToken(token: PushNotificationToken) {
        httpClient.post("${PlatformConfig.MOBILE_API_BASE_URL}${PlatformConfig.Endpoints.PUSH_TOKEN}") {
            setBody(token)
            headers {
                appendAll(authManager.getAuthHeaders())
            }
        }
    }
}
```

### 4. **Location-Based Services**

**Endpoint:** `POST /mobile/nearby`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/location/LocationService.kt
@Serializable
data class LocationRequest(
    val latitude: Double,
    val longitude: Double,
    val radius: Double = 50.0, // km
    val limit: Int = 20,
    val locale: String,
    val currency: String
)

class LocationService {
    suspend fun getNearbyEvents(request: LocationRequest): MobileLocationResponse {
        return httpClient.post("${PlatformConfig.MOBILE_API_BASE_URL}${PlatformConfig.Endpoints.NEARBY}") {
            setBody(request)
            headers {
                appendAll(authManager.getAuthHeaders())
            }
        }.body()
    }
}
```

### 5. **Mobile Search**

**Endpoint:** `POST /mobile/search`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/search/MobileSearchApi.kt
@Serializable
data class MobileSearchRequest(
    val query: String,
    val filters: SearchFilters? = null,
    val sortBy: String = "relevance",
    val sortOrder: String = "desc",
    val page: Int = 1,
    val limit: Int = 20,
    val locale: String,
    val currency: String
)

@Serializable
data class SearchFilters(
    val category: String? = null,
    val location: LocationFilter? = null,
    val dateRange: DateRangeFilter? = null,
    val priceRange: PriceRangeFilter? = null,
    val features: List<String>? = null
)

class MobileSearchApi {
    suspend fun searchEvents(request: MobileSearchRequest): MobileSearchResponse {
        return httpClient.post("${PlatformConfig.MOBILE_API_BASE_URL}${PlatformConfig.Endpoints.SEARCH}") {
            setBody(request)
            headers {
                appendAll(authManager.getAuthHeaders())
            }
        }.body()
    }
}
```

## 🔄 **Offline Support**

### 1. **Offline Data Management**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/offline/OfflineManager.kt
@Serializable
data class OfflineChange(
    val id: String,
    val type: String, // "create", "update", "delete"
    val entityType: String, // "booking", "payment", "user_preference"
    val entityId: String,
    val data: Map<String, Any>,
    val timestamp: String,
    val deviceId: String
)

class OfflineManager {
    private val database = DatabaseFactory()
    
    suspend fun storeOfflineChange(change: OfflineChange) {
        database.storeOfflineChange(change)
    }
    
    suspend fun getPendingChanges(): List<OfflineChange> {
        return database.getPendingChanges()
    }
    
    suspend fun markChangeSynced(changeId: String) {
        database.markChangeSynced(changeId)
    }
    
    suspend fun syncOfflineChanges() {
        val changes = getPendingChanges()
        if (changes.isNotEmpty()) {
            val syncRequest = MobileSyncRequest(
                lastSyncTimestamp = getLastSyncTimestamp(),
                deviceId = getDeviceId(),
                syncTypes = listOf("bookings", "payments", "user"),
                offlineChanges = changes
            )
            
            val response = mobileSyncApi.syncData(syncRequest)
            
            // Mark changes as synced
            changes.forEach { change ->
                markChangeSynced(change.id)
            }
        }
    }
}
```

### 2. **Local Database Schema**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/database/DatabaseSchema.kt
object DatabaseSchema {
    const val DATABASE_NAME = "event_platform.db"
    const val DATABASE_VERSION = 1
    
    object Tables {
        const val EVENTS = "events"
        const val BOOKINGS = "bookings"
        const val PAYMENTS = "payments"
        const val USER = "user"
        const val OFFLINE_CHANGES = "offline_changes"
        const val PREFERENCES = "preferences"
    }
    
    object Events {
        const val ID = "id"
        const val TITLE = "title"
        const val DESCRIPTION = "description"
        const val START_DATE = "start_date"
        const val END_DATE = "end_date"
        const val LOCATION = "location"
        const val PRICING = "pricing"
        const val IMAGES = "images"
        const val LAST_SYNC = "last_sync"
    }
    
    object OfflineChanges {
        const val ID = "id"
        const val TYPE = "type"
        const val ENTITY_TYPE = "entity_type"
        const val ENTITY_ID = "entity_id"
        const val DATA = "data"
        const val TIMESTAMP = "timestamp"
        const val DEVICE_ID = "device_id"
        const val IS_SYNCED = "is_synced"
    }
}
```

## 📊 **Analytics Integration**

### 1. **Mobile Analytics**

**Endpoint:** `POST /mobile/analytics`

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/analytics/MobileAnalytics.kt
@Serializable
data class MobileAnalytics(
    val sessionId: String,
    val userId: String?,
    val deviceId: String,
    val platform: String,
    val appVersion: String,
    val events: List<AnalyticsEvent> = emptyList(),
    val screenViews: List<ScreenView> = emptyList(),
    val userActions: List<UserAction> = emptyList()
)

@Serializable
data class AnalyticsEvent(
    val name: String,
    val timestamp: String,
    val properties: Map<String, Any>? = null
)

@Serializable
data class ScreenView(
    val screen: String,
    val timestamp: String,
    val duration: Double? = null
)

@Serializable
data class UserAction(
    val action: String,
    val timestamp: String,
    val target: String? = null,
    val properties: Map<String, Any>? = null
)

class MobileAnalyticsManager {
    private val analyticsQueue = mutableListOf<MobileAnalytics>()
    
    fun trackEvent(name: String, properties: Map<String, Any>? = null) {
        val event = AnalyticsEvent(
            name = name,
            timestamp = getCurrentTimestamp(),
            properties = properties
        )
        addToQueue(event)
    }
    
    fun trackScreenView(screen: String, duration: Double? = null) {
        val screenView = ScreenView(
            screen = screen,
            timestamp = getCurrentTimestamp(),
            duration = duration
        )
        addToQueue(screenView)
    }
    
    fun trackUserAction(action: String, target: String? = null, properties: Map<String, Any>? = null) {
        val userAction = UserAction(
            action = action,
            timestamp = getCurrentTimestamp(),
            target = target,
            properties = properties
        )
        addToQueue(userAction)
    }
    
    suspend fun sendAnalytics() {
        if (analyticsQueue.isNotEmpty()) {
            val analytics = MobileAnalytics(
                sessionId = getSessionId(),
                userId = getCurrentUserId(),
                deviceId = getDeviceId(),
                platform = getPlatform(),
                appVersion = getAppVersion(),
                events = analyticsQueue.filterIsInstance<AnalyticsEvent>(),
                screenViews = analyticsQueue.filterIsInstance<ScreenView>(),
                userActions = analyticsQueue.filterIsInstance<UserAction>()
            )
            
            httpClient.post("${PlatformConfig.MOBILE_API_BASE_URL}${PlatformConfig.Endpoints.ANALYTICS}") {
                setBody(analytics)
                headers {
                    appendAll(authManager.getAuthHeaders())
                }
            }
            
            analyticsQueue.clear()
        }
    }
}
```

## 🔐 **Security & Authentication**

### 1. **JWT Token Management**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/auth/JwtManager.kt
class JwtManager {
    private var accessToken: String? = null
    private var refreshToken: String? = null
    private var tokenExpiry: Long = 0
    
    fun setTokens(accessToken: String, refreshToken: String, expiresIn: Long) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken
        this.tokenExpiry = System.currentTimeMillis() + (expiresIn * 1000)
    }
    
    fun isTokenExpired(): Boolean {
        return System.currentTimeMillis() >= tokenExpiry
    }
    
    suspend fun refreshTokenIfNeeded() {
        if (isTokenExpired() && refreshToken != null) {
            val newTokens = authApi.refreshToken(refreshToken!!)
            setTokens(newTokens.accessToken, newTokens.refreshToken, newTokens.expiresIn)
        }
    }
    
    fun getValidToken(): String? {
        return if (!isTokenExpired()) accessToken else null
    }
}
```

### 2. **Biometric Authentication**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/auth/BiometricAuth.kt
expect class BiometricAuth {
    suspend fun isBiometricAvailable(): Boolean
    suspend fun authenticate(): Boolean
    suspend fun storeCredentials(credentials: String)
    suspend fun retrieveCredentials(): String?
}

// Android implementation
actual class BiometricAuth {
    actual suspend fun isBiometricAvailable(): Boolean {
        // Android-specific biometric check
        return true
    }
    
    actual suspend fun authenticate(): Boolean {
        // Android-specific biometric authentication
        return true
    }
    
    actual suspend fun storeCredentials(credentials: String) {
        // Store in Android Keystore
    }
    
    actual suspend fun retrieveCredentials(): String? {
        // Retrieve from Android Keystore
        return null
    }
}
```

## 🌍 **Localization & Internationalization**

### 1. **Multi-language Support**

```kotlin
// shared/src/commonMain/kotlin/com/yourapp/localization/LocalizationManager.kt
object LocalizationManager {
    private var currentLocale: String = "en-CA"
    private var currentCurrency: String = "CAD"
    private var currentTimezone: String = "America/Toronto"
    
    fun setLocale(locale: String) {
        currentLocale = locale
    }
    
    fun setCurrency(currency: String) {
        currentCurrency = currency
    }
    
    fun setTimezone(timezone: String) {
        currentTimezone = timezone
    }
    
    fun getCurrentLocale(): String = currentLocale
    fun getCurrentCurrency(): String = currentCurrency
    fun getCurrentTimezone(): String = currentTimezone
    
    fun formatPrice(amount: Double, currency: String = currentCurrency): String {
        return when (currency) {
            "CAD" -> "C$${String.format("%.2f", amount)}"
            "USD" -> "$${String.format("%.2f", amount)}"
            "EUR" -> "€${String.format("%.2f", amount)}"
            else -> "${String.format("%.2f", amount)} $currency"
        }
    }
    
    fun formatDate(date: String, format: String = "MMM dd, yyyy"): String {
        // Date formatting logic
        return date
    }
}
```

## 📱 **Platform-Specific Features**

### 1. **Android Implementation**

```kotlin
// androidApp/src/main/kotlin/com/yourapp/android/AndroidMainActivity.kt
class MainActivity : ComponentActivity() {
    private val biometricAuth = BiometricAuth()
    private val pushNotificationManager = PushNotificationManager()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Firebase for push notifications
        FirebaseApp.initializeApp(this)
        
        // Request notification permissions
        requestNotificationPermissions()
        
        // Register for push notifications
        registerForPushNotifications()
        
        setContent {
            EventPlatformApp()
        }
    }
    
    private fun requestNotificationPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
        }
    }
    
    private fun registerForPushNotifications() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                // Send token to backend
                CoroutineScope(Dispatchers.IO).launch {
                    pushNotificationManager.registerToken(
                        PushNotificationToken(
                            userId = getCurrentUserId(),
                            deviceId = getDeviceId(),
                            platform = "android",
                            token = token
                        )
                    )
                }
            }
        }
    }
}
```

### 2. **iOS Implementation**

```kotlin
// iosApp/src/iosMain/kotlin/com/yourapp/ios/IosApp.kt
@Composable
fun IosApp() {
    val context = LocalContext.current
    val biometricAuth = BiometricAuth()
    
    LaunchedEffect(Unit) {
        // Request notification permissions
        requestNotificationPermissions()
        
        // Register for push notifications
        registerForPushNotifications()
    }
    
    EventPlatformApp()
}

private fun requestNotificationPermissions() {
    // iOS-specific notification permission request
}

private fun registerForPushNotifications() {
    // iOS-specific push notification registration
}
```

## 🧪 **Testing**

### 1. **Unit Tests**

```kotlin
// shared/src/commonTest/kotlin/com/yourapp/api/MobileApiTest.kt
class MobileApiTest {
    private lateinit var mobileApi: MobileApi
    private lateinit var mockHttpClient: MockHttpClient
    
    @BeforeTest
    fun setup() {
        mockHttpClient = MockHttpClient()
        mobileApi = MobileApi(mockHttpClient)
    }
    
    @Test
    fun `test sync data success`() = runTest {
        // Given
        val syncRequest = MobileSyncRequest(
            lastSyncTimestamp = "2024-01-01T00:00:00Z",
            deviceId = "test-device",
            syncTypes = listOf("events", "bookings")
        )
        
        val expectedResponse = MobileSyncResponse(
            lastSyncTimestamp = "2024-01-01T12:00:00Z",
            changes = mapOf(
                "events" to listOf<Any>(),
                "bookings" to listOf<Any>()
            )
        )
        
        mockHttpClient.mockResponse(expectedResponse)
        
        // When
        val result = mobileApi.syncData(syncRequest)
        
        // Then
        assertEquals(expectedResponse, result)
    }
}
```

### 2. **Integration Tests**

```kotlin
// shared/src/commonTest/kotlin/com/yourapp/integration/MobileIntegrationTest.kt
class MobileIntegrationTest {
    private lateinit var mobileApi: MobileApi
    private lateinit var authManager: AuthManager
    
    @BeforeTest
    fun setup() {
        authManager = AuthManager()
        mobileApi = MobileApi(HttpClient())
    }
    
    @Test
    fun `test end-to-end mobile flow`() = runTest {
        // 1. Authenticate user
        val authResponse = authManager.authenticate("test@example.com", "password")
        assertTrue(authResponse.isSuccess)
        
        // 2. Get mobile events
        val events = mobileApi.getMobileEvents()
        assertNotNull(events)
        assertTrue(events.isNotEmpty())
        
        // 3. Search events
        val searchRequest = MobileSearchRequest(
            query = "music",
            locale = "en-CA",
            currency = "CAD"
        )
        val searchResults = mobileApi.searchEvents(searchRequest)
        assertNotNull(searchResults)
        
        // 4. Get nearby events
        val locationRequest = LocationRequest(
            latitude = 43.6532,
            longitude = -79.3832,
            locale = "en-CA",
            currency = "CAD"
        )
        val nearbyEvents = mobileApi.getNearbyEvents(locationRequest)
        assertNotNull(nearbyEvents)
    }
}
```

## 🚀 **Deployment Checklist**

### 1. **Pre-deployment Setup**

- [ ] Configure API Gateway URL in `PlatformConfig`
- [ ] Set up Firebase project for push notifications (Android)
- [ ] Configure Apple Push Notification Service (iOS)
- [ ] Set up biometric authentication certificates
- [ ] Configure local database schema
- [ ] Set up offline sync mechanisms

### 2. **Security Configuration**

- [ ] Implement JWT token management
- [ ] Set up secure token storage
- [ ] Configure biometric authentication
- [ ] Implement certificate pinning
- [ ] Set up app signing certificates

### 3. **Testing**

- [ ] Unit tests for all API calls
- [ ] Integration tests for end-to-end flows
- [ ] Offline functionality testing
- [ ] Push notification testing
- [ ] Performance testing
- [ ] Security testing

### 4. **Monitoring & Analytics**

- [ ] Set up crash reporting
- [ ] Configure performance monitoring
- [ ] Set up user analytics tracking
- [ ] Configure push notification analytics
- [ ] Set up offline sync monitoring

## 📚 **Additional Resources**

- [Compose Multiplatform Documentation](https://kotlinlang.org/docs/multiplatform.html)
- [Ktor HTTP Client Documentation](https://ktor.io/docs/http-client.html)
- [SQLDelight Documentation](https://cashapp.github.io/sqldelight/)
- [Kotlinx Serialization](https://github.com/Kotlin/kotlinx.serialization)
- [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-overview.html)

## 🆘 **Support**

For technical support and questions about the mobile integration:

1. **API Documentation**: Check the OpenAPI specification at `/docs`
2. **Health Check**: Monitor service status at `/mobile/health`
3. **Error Logs**: Check CloudWatch logs for detailed error information
4. **Community**: Join our developer community for discussions and support

---

**Happy coding with Compose Multiplatform! 🎉**
