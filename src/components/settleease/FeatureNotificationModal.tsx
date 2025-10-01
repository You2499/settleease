interface FeatureNotificationModalProps {
  isOpen: boolean;
  notifications: FeatureNotification[];
  onClose: () => void;
  db: SupabaseClient | undefined;
  currentUserId: string;
  onNavigateToFeature?: (featureName: string) => void;
}

const FEATURE_CONFIGS = {
  analytics: {
    name: 'Analytics',
    icon: BarChart3,
    description: 'Advanced analytics and insights for expense tracking',
    enabledMessage: 'You now have access to detailed analytics and spending insights!',
    disabledMessage: 'Analytics features have been temporarily disabled.',
  },
  activityFeed: {
    name: 'Activity Feed',
    icon: Activity,
    description: 'Real-time activity feed showing all expense updates',
    enabledMessage: 'Stay updated with real-time activity notifications!',
    disabledMessage: 'Activity feed has been temporarily disabled.',
  },
};

export default function FeatureNotificationModal({
  isOpen,
  notifications,
  onClose,
  db,
  currentUserId,
  onNavigateToFeature,
}: FeatureNotificationModalProps) {
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const { markNotificationSeen } = useFeatureInteractions();

  const markNotificationsAsRead = useCallback(async () => {
    if (!db || notifications.length === 0) return;

    setIsMarkingAsRead(true);

    try {
      const notificationIds = notifications.map(n => n.id).filter(id => !id.startsWith('kicked-'));
      
      if (notificationIds.length > 0) {
        const { error } = await db
          .from(FEATURE_NOTIFICATIONS_TABLE)
          .update({ is_read: true })
          .in('id', notificationIds);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error marking notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [db, notifications]);

  const handleClose = async () => {
    // Mark all notifications as seen in our interaction tracking
    notifications.forEach(notification => {
      markNotificationSeen(notification.feature_name);
    });
    
    await markNotificationsAsRead();
    onClose();
  };

  // Don't show modal if it's not open or there are no notifications
  if (!isOpen || notifications.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col bg-background border-border/30 w-full max-w-md"
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/15 dark:bg-primary/20 rounded-2xl">
                <Bell className="h-6 w-6 text-primary dark:text-primary/90" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Feature Updates
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {notifications.length} new notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 no-scrollbar">
          {notifications.map((notification) => {
            const featureConfig = FEATURE_CONFIGS[notification.feature_name as keyof typeof FEATURE_CONFIGS];
            if (!featureConfig) return null;

            const FeatureIcon = featureConfig.icon;
            const isEnabled = notification.notification_type === 'enabled';

            return (
              <div
                key={notification.id}
                className="bg-card dark:bg-card/95 border border-border/30 dark:border-border/20 rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/15 dark:bg-primary/20 rounded-xl">
                      <FeatureIcon className="h-5 w-5 text-primary dark:text-primary/90" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-base text-foreground dark:text-foreground/95">
                          {featureConfig.name}
                        </span>
                        <Badge 
                          variant={isEnabled ? "default" : "secondary"}
                          className="flex items-center gap-1 text-xs"
                        >
                          {isEnabled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Disabled
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="px-5 py-4 bg-background/50 dark:bg-background/30 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {featureConfig.description}
                  </p>
                  
                  <div className={`p-3 rounded-lg border ${
                    isEnabled 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30' 
                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {isEnabled ? (
                        <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      )}
                      <p className={`text-sm font-medium ${
                        isEnabled 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-orange-800 dark:text-orange-200'
                      }`}>
                        {isEnabled ? featureConfig.enabledMessage : featureConfig.disabledMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/30">
          {(() => {
            // Check if there are any enabled features that can be navigated to
            const enabledFeatures = notifications.filter(n => n.notification_type === 'enabled');
            const hasNavigableFeatures = enabledFeatures.length > 0 && onNavigateToFeature;

            if (hasNavigableFeatures) {
              return (
                <div className="space-y-3">
                  {enabledFeatures.length === 1 && (
                    <Button
                      onClick={() => {
                        const feature = enabledFeatures[0];
                        const featureName = feature.feature_name === 'analytics' ? 'analytics' : 
                                         feature.feature_name === 'activityFeed' ? 'activityFeed' : 
                                         feature.feature_name;
                        // Mark notification as seen when navigating to feature
                        markNotificationSeen(feature.feature_name);
                        onNavigateToFeature!(featureName);
                        handleClose();
                      }}
                      disabled={isMarkingAsRead}
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-200 active:scale-[0.98]"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Check it out!
                    </Button>
                  )}
                  <Button
                    onClick={handleClose}
                    disabled={isMarkingAsRead}
                    variant={enabledFeatures.length === 1 ? "outline" : "default"}
                    className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
                  >
                    {isMarkingAsRead ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        {enabledFeatures.length === 1 ? 'Maybe later' : 'Got it!'}
                      </>
                    )}
                  </Button>
                </div>
              );
            }

            return (
              <Button
                onClick={handleClose}
                disabled={isMarkingAsRead}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all duration-200 active:scale-[0.98]"
              >
                {isMarkingAsRead ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Got it!
                  </>
                )}
              </Button>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}