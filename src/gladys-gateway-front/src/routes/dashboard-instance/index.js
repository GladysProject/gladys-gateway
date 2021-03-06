import { Component } from 'preact';
import DashboardInstance from './DashboardInstance';
import Auth from '../../api/Auth';

const REFRESH_INTERVAL = 5000;
const INSTANCE_INFOS_CACHE_KEY = 'instances_infos';

class DashboardInstancePage extends Component {
  
  state = {
    instanceInfos: {
      deviceTypeCountReadable: '- ',
      deviceStateCountReadable: '- ',
      uptimeReadable: '- ',
      gladysVersion: '- ',
      cpuUsage: '- '
    },
    noInstanceFoundError: false,
    userNotAcceptedLocallyError: false,
    accountExpired: false,
    latency: '- '
  };

  interval = null;
  lastUpdated = null;

  connected = async () => {
    this.refreshStats();
    this.interval = setInterval(this.refreshStats, REFRESH_INTERVAL);
    Auth.getMySelf()
      .then((user) => {
        const expiredAccountDate = new Date(user.current_period_end);
        if (expiredAccountDate < new Date()) {
          this.setState({ accountExpired: true });
        }
      });
  };

  calculateLatency = async () => {
    let latency = await Auth.calculateLatency();
    this.setState({ latency });
  };

  refreshStats = async () => {
    
    this.calculateLatency();

    try {

      let instanceInfos = await Auth.request.get('/system');
      
      // convert data to readable data
      instanceInfos.cpuUsage = Math.round(instanceInfos.cpuUsage*100);
      instanceInfos.uptimeReadable = this.convertSecondsToReadableTime(instanceInfos.uptime);
      instanceInfos.deviceStateCountReadable = this.convertNumberToReadable(instanceInfos.deviceStateCount);
      instanceInfos.deviceTypeCountReadable = this.convertNumberToReadable(instanceInfos.deviceTypeCount);
      
      this.setState({ instanceInfos });
      this.lastUpdated = new Date();

      Auth.cache.set(INSTANCE_INFOS_CACHE_KEY, { instanceInfos, lastUpdated: new Date() });
    } catch (err) {
      
      if (err && err.status === 404 && err.error_message === 'NO_INSTANCE_FOUND') {
        this.setState({ noInstanceFoundError: true });
      }

      if (err && err.status === 403 && err.error_code === 'USER_NOT_ACCEPTED_LOCALLY') {
        this.setState({ userNotAcceptedLocallyError: true });
      }
    }
  };

  convertSecondsToReadableTime = (seconds) => {
    
    if (seconds === 1) return seconds + ' second';
    
    if (seconds < 60) return seconds + ' seconds';

    let minutes = Math.round(seconds/60);

    if (minutes === 1) return minutes + ' minute';

    if (minutes < 60) return minutes + ' minutes';

    let hours = Math.round(minutes/60);

    if (hours === 1) return hours + ' hour';

    if (hours < 24) return hours + ' hours';

    let days = Math.round(hours/24);

    if (days === 1) return days + ' day';
    
    return days + ' days';
  }

  convertNumberToReadable = (x) => {
    if (isNaN(x)) return x;
  
    if (x < 9999) {
      return x;
    }
  
    if (x < 1000000) {
      return Math.round(x/1000) + 'K';
    }

    if ( x < 10000000) {
      return (x/1000000).toFixed(2) + 'M';
    }
  
    if (x < 1000000000) {
      return Math.round((x/1000000)) + 'M';
    }
  
    if (x < 1000000000000) {
      return Math.round((x/1000000000)) + 'B';
    }
  
    return '1T+';
  }

  trainBrain = async () => {
    await Auth.request.post('/brain/trainnew');
  }

  restartGladys = async () => {
    await Auth.request.post('/system/shutdown');
  }

  componentDidMount = async () => {
    let result = await Auth.cache.get(INSTANCE_INFOS_CACHE_KEY);
    
    if (result && result.instanceInfos && this.lastUpdated === null) {
      this.setState({ instanceInfos: result.instanceInfos });
    }
  }

  componentWillUnmount = () => {
    clearInterval(this.interval);
  }

  render({}, { instanceInfos, latency, noInstanceFoundError, userNotAcceptedLocallyError, accountExpired }) {
    return (
      <DashboardInstance
        connected={this.connected}
        instanceInfos={instanceInfos}
        latency={latency}
        restartGladys={this.restartGladys}
        trainBrain={this.trainBrain}
        noInstanceFoundError={noInstanceFoundError}
        userNotAcceptedLocallyError={userNotAcceptedLocallyError}
        accountExpired={accountExpired}
      />
    );
  }
}

export default DashboardInstancePage;
