import Icon from "../../../controls/Icon";
import ProgressBar from "../../../controls/ProgressBar";
import {
  connect,
  PureComponentEx,
  translate,
} from "../../../controls/ComponentEx";

import * as React from "react";
import type { IState } from "../../../types/IState";
import type { DownloadState, IDownload } from "../types/IDownload";

import { setAttributeFilter } from "../../../actions/tables";

export interface IBaseProps {
  slim: boolean;
}

interface IConnectedProps {
  downloads: { [downloadId: string]: IDownload };
  speed: number;
  liveActiveDownloads: number;
  liveSpeed: number;
}

type IProps = IBaseProps & IConnectedProps;

const STATES: DownloadState[] = ["finalizing", "started", "paused"];

class SpeedOMeter extends PureComponentEx<IProps, {}> {
  public render(): JSX.Element {
    const { t, downloads, slim, speed, liveActiveDownloads, liveSpeed } =
      this.props;
    const displaySpeed = liveSpeed > 0 ? liveSpeed : speed;
    const activeCount =
      liveActiveDownloads > 0
        ? liveActiveDownloads
        : this.countActiveDownloads(downloads);

    if (slim) {
      if (activeCount === 0 && displaySpeed === 0) {
        return null;
      }

      return (
        <span className="active-downloads-slim">
          <Icon name="download-speed" /> {activeCount} |{" "}
          {this.toMegaBytesPerSecond(displaySpeed)}
        </span>
      );
    }

    const activeDownloads = Object.keys(downloads ?? {})
      .filter((id) => STATES.includes(downloads[id].state))
      .map((id) => downloads[id])
      .sort((lhs, rhs) => {
        if (lhs.state !== rhs.state) {
          return STATES.indexOf(lhs.state) - STATES.indexOf(rhs.state);
        } else {
          return lhs.startTime - rhs.startTime;
        }
      });

    if (activeDownloads.length === 0) {
      return null;
    }

    return (
      <div className="active-downloads-container">
        <span>{t("Active Downloads")}</span>
        <span className="active-downloads-stats">
          {t("Live: {{count}} active, {{speed}}", {
            replace: {
              count: activeCount > 0 ? activeCount : activeDownloads.length,
              speed: this.toMegaBytesPerSecond(displaySpeed),
            },
          })}
        </span>
        {activeDownloads.slice(0, 2).map(this.renderDownload)}
        {activeDownloads.length > 2 ? (
          <a onClick={this.openDownloads}>{t("More...")}</a>
        ) : null}
        <span>
          <Icon name="download-speed" />{" "}
          {this.toMegaBytesPerSecond(displaySpeed)}
        </span>
      </div>
    );
  }

  private openDownloads = () => {
    this.context.api.events.emit("show-main-page", "Downloads");
    this.context.api.store.dispatch(
      setAttributeFilter("downloads", "progress", "In Progress"),
    );
  };

  private renderDownload = (download: IDownload) => {
    const size = Math.max(1, download.size ?? 0, download.received);
    const perc = (download.received * 100) / size;
    return (
      <ProgressBar
        key={download.localPath}
        min={0}
        max={size}
        now={download.received}
        labelLeft={download.localPath}
        labelRight={perc.toFixed(0) + "%"}
      />
    );
  };

  private toMegaBytesPerSecond = (speed: number) => {
    const mb = speed / (1024 * 1024);
    const decimals = mb >= 100 ? 0 : mb >= 10 ? 1 : 2;
    return `${mb.toFixed(decimals)} MB/s`;
  };

  private countActiveDownloads(downloads: { [downloadId: string]: IDownload }) {
    return Object.keys(downloads ?? {}).reduce((count, id) => {
      return count + (STATES.includes(downloads[id].state) ? 1 : 0);
    }, 0);
  }
}

function mapStateToProps(state: IState): IConnectedProps {
  return {
    downloads: state.persistent.downloads.files,
    speed: state.persistent.downloads.speed || 0,
    liveActiveDownloads: state.persistent.downloads.live?.activeDownloads || 0,
    liveSpeed: state.persistent.downloads.live?.speed || 0,
  };
}

export default translate(["common"])(
  connect(mapStateToProps)(SpeedOMeter),
) as React.ComponentClass<IBaseProps>;
