import React from 'react';
import { Grid } from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';
import LocalLibrary from '@material-ui/icons/LocalLibrary';
import Assignment from '@material-ui/icons/Assignment';
import {
  HomePageToolkit,
  HomePageRandomJoke,
  HomePageStarredEntities,
  CustomHomepageGrid,
  WelcomeTitle
} from '@backstage/plugin-home';

const defaultConfig = [
  {
    component: 'HomePageStarredEntities',
    x: 0,
    y: 0,
    width: 6,
    height: 10,
  },
  {
    component: 'HomePageToolkit',
    x: 6,
    y: 0,
    width: 6,
    height: 10,
  },
];

const toolkitTools = [
  {
    url: 'https://wiki.rabe.ch',
    label: 'RaBe Wiki',
    icon: <LocalLibrary />,
  },
  {
    url: 'https://board.rabe.ch',
    label: 'Kanboard',
    icon: <Assignment />,
  }
]

export const homePage = (
  <Page themeId="home">
    <Header title={<WelcomeTitle />} pageTitleOverride="Home" />
    <Content>
      <Grid container justifyContent="center" spacing={6}>
        <Grid container item xs={12} justifyContent='center' />
      </Grid>
      <CustomHomepageGrid config={defaultConfig}>
        <HomePageToolkit
          tools={toolkitTools}
        />
        <HomePageRandomJoke />
        <HomePageStarredEntities />
      </CustomHomepageGrid>
    </Content>
  </Page>
)
