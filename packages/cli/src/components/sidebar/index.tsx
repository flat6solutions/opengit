import Files from "@components/panes/files"

export default function Sidebar(props: { visible: boolean }) {
  return (
    <box width="100%" height="100%" flexDirection="column">
      <box width="100%" flexDirection="column" flexGrow={1} gap={1}>
        <Files visible={props.visible} />
      </box>
    </box>
  )
}
