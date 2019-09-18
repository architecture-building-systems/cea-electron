import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Layout } from 'antd';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import Tool from '../components/Tools/Tool';
import InputEditor from '../components/InputEditor/InputEditor';
import Dashboard from '../components/Dashboard/Dashboard';
import Project from '../components/Project/Project';

import routes from '../constants/routes';

const { Footer, Content } = Layout;

const HomePage = () => {
  return (
    <Layout>
      <SideNav />
      <Layout
        style={{
          height: 'calc(100vh - 28px)',
          minWidth: 500
        }}
      >
        <Header />
        <Content
          style={{
            margin: '24px 16px',
            marginTop: 88,
            padding: 24,
            background: '#fff',
            minHeight: 'fit-content'
          }}
        >
          <Switch>
            <Route path={`${routes.TOOLS}/:script`} component={Tool} />
            <Route path={routes.INPUT_EDITOR} component={InputEditor} />
            <Route path="/placeholder" component={PlaceHolder} />
            <Route path={routes.DASHBOARD} component={Dashboard} />
            <Route path={routes.PROJECT} component={Project} />
          </Switch>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Ant Design ©2018 Created by Ant UED
        </Footer>
      </Layout>
    </Layout>
  );
};

const PlaceHolder = () => {
  return <div>PlaceHolder</div>;
};

export default HomePage;
