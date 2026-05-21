from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'farmers', views.FarmerViewSet)
router.register(r'farms', views.FarmViewSet)
router.register(r'activities', views.ActivityViewSet)
router.register(r'reminders', views.ReminderViewSet)
router.register(r'knowledge', views.KnowledgeViewSet)
router.register(r'crop-calendar', views.CropCalendarViewSet)
router.register(r'officers', views.AgriculturalOfficerViewSet)
router.register(r'consultations', views.ConsultationViewSet)

urlpatterns = [
    # Include ViewSet routes
    path('', include(router.urls)),
    
    # Weather
    path('weather/current', views.weather_current, name='weather-current'),
    path('weather/hourly', views.weather_hourly, name='weather-hourly'),
    path('weather/daily', views.weather_daily, name='weather-daily'),

    # Farmers
    path('farmers/', views.FarmerViewSet.as_view({'get': 'list', 'post': 'create'}), name='farmers-list'),
    path('farmers/summary/', views.farmers_summary, name='farmers-summary'),
    path('farmers/<int:pk>/', views.FarmerViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='farmers-detail'),
    path('farmers/<int:farmer_id>/dashboard/', views.farmer_dashboard, name='farmer-dashboard'),

    # Market
    path('market/prices', views.market_prices, name='market-prices'),
    path('market/commodities', views.market_commodities, name='market-commodities'),
    path('market/markets', views.market_markets, name='market-markets'),
    path('market/districts', views.market_districts, name='market-districts'),

    # Disease detection
    path('disease/detect', views.disease_detect, name='disease-detect'),

    # Chatbot and translation (simple placeholders)
    path('chatbot/chat', views.chatbot_chat, name='chatbot-chat'),
    path('chatbot/gemini', views.chatbot_gemini, name='chatbot-gemini'),
    path('chatbot/remedies', views.chatbot_remedies, name='chatbot-remedies'),
    path('translate', views.translate_text, name='translate'),
    path('test-gemini', views.test_gemini, name='test-gemini'),
    
]
