import { LoggingService } from './LoggingService';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { ExternalSigner } from '../models/ExternalSigner';
import { UserWalletConnection } from '../models/UserWalletConnection';

export interface NotificationPreferences {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  transaction_requests: boolean;
  signer_changes: boolean;
  transaction_status: boolean;
  security_alerts: boolean;
  do_not_disturb: boolean;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string; // HH:MM format
}

export interface NotificationData {
  type: 'transaction_request' | 'signer_added' | 'signer_removed' | 'signer_weight_changed' | 'transaction_signed' | 'transaction_submitted' | 'transaction_confirmed' | 'transaction_cancelled' | 'security_alert' | 'wallet_config_changed';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  action_url?: string;
  expires_at?: Date;
}

export interface NotificationRecipient {
  user_id: string;
  email?: string;
  phone?: string;
  push_token?: string;
  preferences: NotificationPreferences;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Notify signers of new transaction request
   */
  async notifyTransactionRequest(
    walletId: string,
    transactionId: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of new transaction request', {
        walletId,
        transactionId,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'transaction_request',
        title: 'New Transaction Requires Your Signature',
        message: `A new ${transaction.type} transaction requires your signature for wallet ${wallet.name}`,
        priority: this.getTransactionPriority(transaction.type),
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          transaction_id: transactionId,
          transaction_type: transaction.type,
          amount: transaction.amount,
          destination: transaction.destination,
          memo: transaction.memo,
          urgency_level: this.getTransactionUrgency(transaction.type),
        },
        action_url: `/transactions/${transactionId}/review`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of transaction request', {
        walletId,
        transactionId,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of transaction request', {
        walletId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify signers when transaction is signed
   */
  async notifyTransactionSigned(
    walletId: string,
    transactionId: string,
    signerAddress: string,
    currentWeight: number,
    requiredWeight: number
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of transaction signature', {
        walletId,
        transactionId,
        signerAddress,
        currentWeight,
        requiredWeight,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);
      const transaction = await Transaction.findByPk(transactionId);

      if (!wallet || !transaction) {
        throw new Error('Wallet or transaction not found');
      }

      const progressPercentage = Math.round((currentWeight / requiredWeight) * 100);
      const isQuorumReached = currentWeight >= requiredWeight;

      const notificationData: NotificationData = {
        type: 'transaction_signed',
        title: 'Transaction Signed',
        message: `Transaction signed by ${this.getSignerDisplayName(signerAddress, signers)}. Progress: ${progressPercentage}%`,
        priority: isQuorumReached ? 'high' : 'medium',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          transaction_id: transactionId,
          signer_address: signerAddress,
          current_weight: currentWeight,
          required_weight: requiredWeight,
          progress_percentage: progressPercentage,
          quorum_reached: isQuorumReached,
        },
        action_url: `/transactions/${transactionId}/status`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of transaction signature', {
        walletId,
        transactionId,
        signerCount: signers.length,
        quorumReached: isQuorumReached,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of transaction signature', {
        walletId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify when transaction is submitted to XRPL
   */
  async notifyTransactionSubmitted(
    walletId: string,
    transactionId: string,
    transactionHash: string,
    ledgerIndex: number
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of transaction submission', {
        walletId,
        transactionId,
        transactionHash,
        ledgerIndex,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'transaction_submitted',
        title: 'Transaction Submitted to XRPL',
        message: `Transaction for wallet ${wallet.name} has been submitted to the XRPL network`,
        priority: 'high',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          transaction_id: transactionId,
          transaction_hash: transactionHash,
          ledger_index: ledgerIndex,
        },
        action_url: `/transactions/${transactionId}/status`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of transaction submission', {
        walletId,
        transactionId,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of transaction submission', {
        walletId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify when signer is added to wallet
   */
  async notifySignerAdded(
    walletId: string,
    signerAddress: string,
    weight: number,
    addedBy: string
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of new signer addition', {
        walletId,
        signerAddress,
        weight,
        addedBy,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);
      const addedByUser = await User.findByPk(addedBy);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'signer_added',
        title: 'New Signer Added to Wallet',
        message: `A new signer has been added to wallet ${wallet.name} by ${addedByUser?.email || 'Unknown user'}`,
        priority: 'high',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          signer_address: signerAddress,
          signer_weight: weight,
          added_by: addedBy,
          added_by_email: addedByUser?.email,
        },
        action_url: `/wallets/${walletId}/signers`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of new signer addition', {
        walletId,
        signerAddress,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of new signer addition', {
        walletId,
        signerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify when signer is removed from wallet
   */
  async notifySignerRemoved(
    walletId: string,
    signerAddress: string,
    removedBy: string
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of signer removal', {
        walletId,
        signerAddress,
        removedBy,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);
      const removedByUser = await User.findByPk(removedBy);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'signer_removed',
        title: 'Signer Removed from Wallet',
        message: `A signer has been removed from wallet ${wallet.name} by ${removedByUser?.email || 'Unknown user'}`,
        priority: 'high',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          signer_address: signerAddress,
          removed_by: removedBy,
          removed_by_email: removedByUser?.email,
        },
        action_url: `/wallets/${walletId}/signers`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of signer removal', {
        walletId,
        signerAddress,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of signer removal', {
        walletId,
        signerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify when signer weight is changed
   */
  async notifySignerWeightChanged(
    walletId: string,
    signerAddress: string,
    oldWeight: number,
    newWeight: number,
    changedBy: string
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of weight change', {
        walletId,
        signerAddress,
        oldWeight,
        newWeight,
        changedBy,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);
      const changedByUser = await User.findByPk(changedBy);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'signer_weight_changed',
        title: 'Signer Weight Changed',
        message: `Signer weight changed from ${oldWeight} to ${newWeight} in wallet ${wallet.name}`,
        priority: 'medium',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          signer_address: signerAddress,
          old_weight: oldWeight,
          new_weight: newWeight,
          changed_by: changedBy,
          changed_by_email: changedByUser?.email,
        },
        action_url: `/wallets/${walletId}/signers`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of weight change', {
        walletId,
        signerAddress,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of weight change', {
        walletId,
        signerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Notify when transaction is cancelled
   */
  async notifyTransactionCancelled(
    walletId: string,
    transactionId: string,
    cancelledBy: string
  ): Promise<void> {
    try {
      LoggingService.info('Notifying signers of transaction cancellation', {
        walletId,
        transactionId,
        cancelledBy,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);
      const cancelledByUser = await User.findByPk(cancelledBy);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'transaction_cancelled',
        title: 'Transaction Cancelled',
        message: `Transaction has been cancelled by ${cancelledByUser?.email || 'Unknown user'}`,
        priority: 'medium',
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          transaction_id: transactionId,
          cancelled_by: cancelledBy,
          cancelled_by_email: cancelledByUser?.email,
        },
        action_url: `/transactions/${transactionId}/status`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully notified signers of transaction cancellation', {
        walletId,
        transactionId,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to notify signers of transaction cancellation', {
        walletId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(
    walletId: string,
    alertType: string,
    alertMessage: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      LoggingService.info('Sending security alert notification', {
        walletId,
        alertType,
        severity,
      });

      const signers = await this.getWalletSigners(walletId);
      const wallet = await Wallet.findByPk(walletId);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const notificationData: NotificationData = {
        type: 'security_alert',
        title: `Security Alert: ${alertType}`,
        message: alertMessage,
        priority: severity,
        data: {
          wallet_id: walletId,
          wallet_name: wallet.name,
          alert_type: alertType,
          severity,
          timestamp: new Date().toISOString(),
        },
        action_url: `/wallets/${walletId}/security`,
      };

      await this.sendNotificationsToSigners(signers, notificationData);

      LoggingService.info('Successfully sent security alert notification', {
        walletId,
        alertType,
        signerCount: signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to send security alert notification', {
        walletId,
        alertType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get wallet signers with their notification preferences
   */
  private async getWalletSigners(walletId: string): Promise<NotificationRecipient[]> {
    try {
      const externalSigners = await ExternalSigner.findAll({
        where: {
          wallet_id: walletId,
          is_active: true,
        },
        include: [
          {
            model: User,
            as: 'addedByUser',
            attributes: ['id', 'email', 'phone'],
          },
        ],
      });

      const recipients: NotificationRecipient[] = [];

      for (const signer of externalSigners) {
        // Find user wallet connection to get notification preferences
        const walletConnection = await UserWalletConnection.findOne({
          where: {
            public_address: signer.public_address,
          },
        });

        if (walletConnection) {
          const user = await User.findByPk(walletConnection.user_id);
          if (user) {
            recipients.push({
              user_id: user.id,
              email: user.email,
              phone: user.phone,
              push_token: user.push_token, // Assuming this field exists
              preferences: this.getDefaultNotificationPreferences(), // TODO: Get from user preferences
            });
          }
        }
      }

      return recipients;
    } catch (error) {
      LoggingService.error('Failed to get wallet signers', {
        walletId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send notifications to signers
   */
  private async sendNotificationsToSigners(
    recipients: NotificationRecipient[],
    notificationData: NotificationData
  ): Promise<void> {
    try {
      for (const recipient of recipients) {
        // Check if user is in do not disturb mode
        if (this.isInDoNotDisturb(recipient.preferences)) {
          continue;
        }

        // Check if user has enabled this type of notification
        if (!this.shouldSendNotification(recipient.preferences, notificationData.type)) {
          continue;
        }

        // Send notifications based on user preferences
        if (recipient.preferences.push_notifications && recipient.push_token) {
          await this.sendPushNotification(recipient.push_token, notificationData);
        }

        if (recipient.preferences.email_notifications && recipient.email) {
          await this.sendEmailNotification(recipient.email, notificationData);
        }

        if (recipient.preferences.sms_notifications && recipient.phone) {
          await this.sendSMSNotification(recipient.phone, notificationData);
        }

        // Store notification in database
        await this.storeNotification(recipient.user_id, notificationData);
      }
    } catch (error) {
      LoggingService.error('Failed to send notifications to signers', {
        recipientCount: recipients.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if user is in do not disturb mode
   */
  private isInDoNotDisturb(preferences: NotificationPreferences): boolean {
    if (!preferences.do_not_disturb) {
      return false;
    }

    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    preferences: NotificationPreferences,
    notificationType: string
  ): boolean {
    switch (notificationType) {
      case 'transaction_request':
        return preferences.transaction_requests;
      case 'signer_added':
      case 'signer_removed':
      case 'signer_weight_changed':
        return preferences.signer_changes;
      case 'transaction_signed':
      case 'transaction_submitted':
      case 'transaction_confirmed':
      case 'transaction_cancelled':
        return preferences.transaction_status;
      case 'security_alert':
        return preferences.security_alerts;
      default:
        return true;
    }
  }

  /**
   * Get transaction priority based on type
   */
  private getTransactionPriority(transactionType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (transactionType) {
      case 'Payment':
        return 'high';
      case 'TrustSet':
        return 'medium';
      case 'OfferCreate':
      case 'OfferCancel':
        return 'medium';
      case 'EscrowCreate':
      case 'EscrowFinish':
      case 'EscrowCancel':
        return 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Get transaction urgency level
   */
  private getTransactionUrgency(transactionType: string): 'low' | 'medium' | 'high' {
    switch (transactionType) {
      case 'Payment':
        return 'high';
      case 'TrustSet':
        return 'medium';
      case 'OfferCreate':
      case 'OfferCancel':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get signer display name
   */
  private getSignerDisplayName(signerAddress: string, signers: NotificationRecipient[]): string {
    // This would look up the signer's nickname or email
    // For now, return a shortened address
    return `${signerAddress.slice(0, 8)}...${signerAddress.slice(-8)}`;
  }

  /**
   * Get default notification preferences
   */
  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      push_notifications: true,
      email_notifications: true,
      sms_notifications: false,
      transaction_requests: true,
      signer_changes: true,
      transaction_status: true,
      security_alerts: true,
      do_not_disturb: false,
    };
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private async sendPushNotification(pushToken: string, notificationData: NotificationData): Promise<void> {
    // TODO: Implement push notification service (Firebase, OneSignal, etc.)
    LoggingService.info('Sending push notification', {
      pushToken,
      notificationType: notificationData.type,
    });
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(email: string, notificationData: NotificationData): Promise<void> {
    // TODO: Implement email service (SendGrid, AWS SES, etc.)
    LoggingService.info('Sending email notification', {
      email,
      notificationType: notificationData.type,
    });
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(phone: string, notificationData: NotificationData): Promise<void> {
    // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
    LoggingService.info('Sending SMS notification', {
      phone,
      notificationType: notificationData.type,
    });
  }

  /**
   * Store notification in database (placeholder implementation)
   */
  private async storeNotification(userId: string, notificationData: NotificationData): Promise<void> {
    // TODO: Implement notification storage in database
    LoggingService.info('Storing notification in database', {
      userId,
      notificationType: notificationData.type,
    });
  }
} 